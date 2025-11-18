import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserMetadata";

export async function test_api_guest_user_refresh_rejects_missing_refresh_token(
  connection: api.IConnection,
) {
  // 1. Establish a realistic guest context by joining as a guest user.
  const joinBody = {
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppGuestUser.IJoin;

  const authorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Prepare an invalid refresh token string that does NOT correspond
  //    to the actual refresh token issued for this guest.
  const invalidRefreshToken: string = `invalid-refresh-token-${RandomGenerator.alphaNumeric(16)}`;

  const invalidRefreshBody = {
    refresh_token: invalidRefreshToken,
  } satisfies ITodoAppGuestUser.IRefresh;

  // 3. Call the refresh endpoint with the invalid token and assert that
  //    it fails rather than returning a new IAuthorized payload.
  await TestValidator.error(
    "guest refresh must reject invalid refresh token",
    async () => {
      await api.functional.auth.guestUser.refresh(connection, {
        body: invalidRefreshBody,
      });
    },
  );
}
