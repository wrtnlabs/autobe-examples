import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Ensure single-use refresh token enforcement in authentication flow.
 *
 * This test simulates the following steps:
 *
 * 1. Register a new user with random, valid data and obtain the initial
 *    authentication and refresh tokens.
 * 2. Successfully rotate using the issued refresh token to get new tokens.
 * 3. Attempt to use the original refresh token again. The endpoint must reject
 *    replay attempts and not issue a further token set.
 * 4. Assert that the error occurs only for the replay attempt.
 * 5. Confirm the new tokens from the rotation are valid and distinct from the
 *    previous set, and only the latest refresh token is now valid.
 */
export async function test_api_auth_token_refresh_replay_prevention(
  connection: api.IConnection,
) {
  // 1. Register a new user and obtain the first tokens
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test-refresh-token/registration",
    referrer: "https://test-refresh-token/landing",
    ip: undefined,
  } satisfies ITodoListUser.IJoin;
  const joinResult = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(joinResult);

  // 2. Use the received refresh token for valid rotation
  const refreshToken1 = joinResult.token.refresh;
  const refreshResult = await api.functional.auth.user.refresh(connection, {
    body: {} satisfies ITodoListUser.IRefresh,
  });
  typia.assert(refreshResult);

  // 3. Try to reuse the original refresh token (should be rejected)
  // Explicitly set original refresh token into the Authorization header for this step only
  const staleConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: refreshToken1,
    },
  };
  await TestValidator.error(
    "replay of used refresh token is rejected",
    async () => {
      await api.functional.auth.user.refresh(staleConnection, {
        body: {} satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // 4. Ensure the new refresh token is valid (should succeed)
  // By default, api.functional.auth.user.refresh uses connection.headers.Authorization, now set to the latest valid access token
  const refreshResult2 = await api.functional.auth.user.refresh(connection, {
    body: {} satisfies ITodoListUser.IRefresh,
  });
  typia.assert(refreshResult2);

  // 5. Confirm token rotation semantics (auth and refresh tokens should differ)
  TestValidator.notEquals(
    "rotated access token differs from initial",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "rotated refresh token differs from initial",
    refreshResult.token.refresh,
    joinResult.token.refresh,
  );
  TestValidator.notEquals(
    "subsequent rotation differs again",
    refreshResult2.token.refresh,
    refreshResult.token.refresh,
  );
}
