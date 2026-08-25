import { services } from "@song-spotlight/api/handlers";
import type { UserData } from "@song-spotlight/api/structs";

export function makeMockData() {
	return services.flatMap((service) =>
		service.types.map(type => ({
			service: service.name,
			type,
			id: crypto.randomUUID(),
		}))
	).sort(() => Math.random() > 0.5 ? -1 : 1) as UserData;
}

if (require.main === module) process.stdout.write(JSON.stringify(makeMockData()));
