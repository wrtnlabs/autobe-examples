import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_token_refresh_token_rotation(
  connection: api.IConnection,
) {
  // Step 1: Create user account to get initial tokens
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const initialUser = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(initialUser);

  // Step 2: Extract initial tokens
  const initialAccessToken = initialUser.token.access;
  const initialRefreshToken = initialUser.token.refresh;

  TestValidator.predicate(
    "initial access token is not empty",
    initialAccessToken.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token is not empty",
    initialRefreshToken.length > 0,
  );

  // Step 3: Perform first refresh operation
  const firstRefresh = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies ITodoAppUser.IRefresh,
  });
  typia.assert(firstRefresh);

  const firstRefreshAccessToken = firstRefresh.token.access;
  const firstRefreshRefreshToken = firstRefresh.token.refresh;

  // Step 4: Validate that refresh tokens are different after rotation
  TestValidator.notEquals(
    "first refresh should return new refresh token different from initial",
    initialRefreshToken,
    firstRefreshRefreshToken,
  );

  // Step 5: Perform second refresh operation using the newly obtained refresh token
  const secondRefresh = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: firstRefreshRefreshToken,
    } satisfies ITodoAppUser.IRefresh,
  });
  typia.assert(secondRefresh);

  const secondRefreshAccessToken = secondRefresh.token.access;
  const secondRefreshRefreshToken = secondRefresh.token.refresh;

  // Step 6: Validate that second refresh also rotates the token
  TestValidator.notEquals(
    "second refresh should return new refresh token different from first refresh token",
    firstRefreshRefreshToken,
    secondRefreshRefreshToken,
  );

  // Step 7: Validate all three refresh tokens are unique (no token reuse across operations)
  TestValidator.notEquals(
    "initial and first refresh tokens must differ",
    initialRefreshToken,
    firstRefreshRefreshToken,
  );
  TestValidator.notEquals(
    "first and second refresh tokens must differ",
    firstRefreshRefreshToken,
    secondRefreshRefreshToken,
  );
  TestValidator.notEquals(
    "initial and second refresh tokens must differ",
    initialRefreshToken,
    secondRefreshRefreshToken,
  );
}
