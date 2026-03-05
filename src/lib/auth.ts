import { jwtVerify, SignJWT } from "jose";
import { JWTExpired } from "jose/errors";

export interface TokenPayload {
	userId: string;
	exp: number;
}

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing or empty");
if (!process.env.JWT_REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET is missing or empty");

// used for breaking changes related to auth
const issuer = "song-spotlight:1";
const alg = "HS256";

const accessSecret = new TextEncoder().encode(process.env.JWT_SECRET);
const accessExpiry = "12h";

const refreshSecret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET);
const refreshExpiry = "2y";

type TokenType = "access" | "refresh";

interface ParsedToken {
	user?: TokenPayload;
	expired?: boolean;
}

async function parseUser(token: string, tokenType: TokenType): Promise<ParsedToken> {
	const isRefresh = tokenType === "refresh";
	try {
		const verified = await jwtVerify<TokenPayload>(
			token,
			isRefresh ? refreshSecret : accessSecret,
			{
				algorithms: [alg],
				maxTokenAge: isRefresh ? refreshExpiry : accessExpiry,
				issuer,
			},
		);
		return {
			user: verified.payload,
		};
	} catch (error) {
		return {
			expired: error instanceof JWTExpired,
		};
	}
}

export async function getUser(token?: string, tokenType: TokenType = "access") {
	const parsed = token && await parseUser(token, tokenType);
	return (parsed && parsed.user) || null;
}
export async function isValid(token?: string, tokenType: TokenType = "access") {
	const parsed = token && await parseUser(token, tokenType);
	return !!(parsed && (parsed.user || parsed.expired));
}

export async function createAccessToken(userId: string) {
	return await new SignJWT({
		userId,
	})
		.setProtectedHeader({ alg })
		.setIssuedAt()
		.setIssuer(issuer)
		.setExpirationTime(accessExpiry)
		.sign(accessSecret);
}

export async function createRefreshToken(userId: string) {
	return await new SignJWT({
		userId,
	})
		.setProtectedHeader({ alg })
		.setIssuedAt()
		.setIssuer(issuer)
		.setExpirationTime(refreshExpiry)
		.sign(refreshSecret);
}
