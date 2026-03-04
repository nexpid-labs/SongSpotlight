import { jwtVerify, SignJWT } from "jose";

export interface TokenPayload {
	userId: string;
	exp: number;
}

// used for breaking changes related to auth
const issuer = "song-spotlight:1";
const alg = "HS256";

const accessSecret = new TextEncoder().encode(process.env.JWT_SECRET);
const accessExpiry = "12h";

const refreshSecret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET);
const refreshExpiry = "2y";

type TokenType = "access" | "refresh";

async function parseUser(token: string, tokenType: TokenType): Promise<TokenPayload | null> {
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
		return verified.payload;
	} catch {
		return null;
	}
}

export async function getUser(token?: string, tokenType: TokenType = "access") {
	const user = token && await parseUser(token, tokenType);
	return user && user.exp > Date.now() / 1000 ? user : null;
}
export async function isValid(token?: string, tokenType: TokenType = "access") {
	const user = token && await parseUser(token, tokenType);
	return !!user;
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
