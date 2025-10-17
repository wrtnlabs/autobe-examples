import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful authentication token renewal using refresh token after user
 * registration.
 *
 * 1. Register a new minimal user (random, valid email and password).
 * 2. Assert the registration response and extract id and tokens.
 * 3. Call the /auth/user/refresh endpoint with the correct refresh token.
 * 4. Assert the refresh response and validate:
 *
 *    - User id remains the same.
 *    - The new token values (access, refresh) differ from the originals.
 *    - All response fields and types are valid.
 */
export async function test_api_refresh_token_success_path(
  connection: api.IConnection,
) {
  // 1. Register new user
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies ITodoListUser.IJoin;
  const original = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(original);

  // 2. Prepare refresh body with correct token
  const refreshBody = {
    refresh_token: original.token.refresh,
  } satisfies ITodoListUser.IRefresh;
  const refreshed = await api.functional.auth.user.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshed);

  // 3. Validate that id is unchanged
  TestValidator.equals(
    "user id remains consistent after refresh",
    refreshed.id,
    original.id,
  );
  // 4. Validate new tokens are issued and not equal to originals
  TestValidator.notEquals(
    "access token changes on refresh",
    refreshed.token.access,
    original.token.access,
  );
  TestValidator.notEquals(
    "refresh token changes on refresh",
    refreshed.token.refresh,
    original.token.refresh,
  );
  // 5. Assert the structure and types again explicitly
  typia.assert(refreshed.token);
  typia.assert(original.token);
}
