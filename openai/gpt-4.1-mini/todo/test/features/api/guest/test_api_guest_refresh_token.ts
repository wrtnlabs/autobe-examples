import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function test_api_guest_refresh_token(
  connection: api.IConnection,
) {
  // 1. Create a temporary guest user account using the guest join API
  const createBody = {
    email: `guest_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: `Pwd${RandomGenerator.alphaNumeric(12)}`,
  } satisfies ITodoListGuest.ICreate;

  const authorized: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2. Extract old tokens
  const oldToken: IAuthorizationToken = authorized.token;

  TestValidator.predicate(
    "Initial token access token is non-empty",
    oldToken.access.length > 0,
  );
  TestValidator.predicate(
    "Initial token refresh token is non-empty",
    oldToken.refresh.length > 0,
  );

  // 3. Use the refresh API to get new tokens
  const refreshed: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection);
  typia.assert(refreshed);

  const newToken: IAuthorizationToken = refreshed.token;

  TestValidator.predicate(
    "Refreshed token access token is non-empty",
    newToken.access.length > 0,
  );
  TestValidator.predicate(
    "Refreshed token refresh token is non-empty",
    newToken.refresh.length > 0,
  );

  // 4. Ensure new tokens differ from old tokens to verify invalidation
  TestValidator.notEquals(
    "Access token has changed after refresh",
    oldToken.access,
    newToken.access,
  );

  TestValidator.notEquals(
    "Refresh token has changed after refresh",
    oldToken.refresh,
    newToken.refresh,
  );
}
