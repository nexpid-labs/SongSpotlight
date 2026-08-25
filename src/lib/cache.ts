function getUserKey(url: string, userId: string) {
	return new Request(new URL(`/__cache/data/${userId}`, url));
}

export function matchUserCache(url: string, userId: string) {
	return caches.default.match(getUserKey(url, userId));
}
export function putUserCache(url: string, userId: string, response: Response) {
	return caches.default.put(getUserKey(url, userId), response.clone());
}
export function deleteUserCache(url: string, userId: string) {
	return caches.default.delete(getUserKey(url, userId));
}
