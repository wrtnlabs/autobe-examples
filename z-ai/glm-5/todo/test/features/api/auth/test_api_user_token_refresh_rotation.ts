import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test token rotation behavior when refreshing tokens.
 *
 * This test verifies that:
 * 1. Token rotation is enforced for security
 * 2. Old refresh tokens are invalidated after use
 * 3. Token reuse attacks are prevented
 * 4. Each refresh produces cryptographically unique tokens
 * 5. Multiple sequential refreshes work correctly
 */
export async function test_api_user_token_refresh_rotation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user account and get initial tokens
  const userConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_user_join(userConnection, {});
  typia.assert(initialAuth);
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  // Step 2: Perform first token refresh
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshAuth = await authorize_user_refresh(
    firstRefreshConnection,
    {
      body: {
        refreshToken: initialRefreshToken,
      } satisfies ITodoAppUser.IRefresh,
    },
  );
  typia.assert(firstRefreshAuth);
  const firstRefreshAccessToken = firstRefreshAuth.token.access;
  const firstRefreshRefreshToken = firstRefreshAuth.token.refresh;
  // Verify tokens are different from initial tokens (token rotation)
  TestValidator.notEquals(
    "first refresh access token differs from initial",
    firstRefreshAccessToken,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "first refresh token differs from initial",
    firstRefreshRefreshToken,
    initialRefreshToken,
  );
  // Step 3: Attempt to use the OLD refresh token again (token reuse attack)
  await TestValidator.error(
    "old refresh token should be rejected after use",
    async () => {
      const reuseConnection: api.IConnection = { host: connection.host };
      await authorize_user_refresh(reuseConnection, {
        body: {
          refreshToken: initialRefreshToken,
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );
  // Step 4: Verify the new refresh token works correctly
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshAuth = await authorize_user_refresh(
    secondRefreshConnection,
    {
      body: {
        refreshToken: firstRefreshRefreshToken,
      } satisfies ITodoAppUser.IRefresh,
    },
  );
  typia.assert(secondRefreshAuth);
  const secondRefreshAccessToken = secondRefreshAuth.token.access;
  const secondRefreshRefreshToken = secondRefreshAuth.token.refresh;
  // Verify second refresh tokens are different from first refresh tokens
  TestValidator.notEquals(
    "second refresh access token differs from first",
    secondRefreshAccessToken,
    firstRefreshAccessToken,
  );
  TestValidator.notEquals(
    "second refresh token differs from first",
    secondRefreshRefreshToken,
    firstRefreshRefreshToken,
  );
  // Step 5: Verify third sequential refresh works (continued token rotation)
  const thirdRefreshConnection: api.IConnection = { host: connection.host };
  const thirdRefreshAuth = await authorize_user_refresh(
    thirdRefreshConnection,
    {
      body: {
        refreshToken: secondRefreshRefreshToken,
      } satisfies ITodoAppUser.IRefresh,
    },
  );
  typia.assert(thirdRefreshAuth);
  // Verify user identity is preserved across token rotations
  TestValidator.equals(
    "user id preserved after multiple refreshes",
    thirdRefreshAuth.id,
    initialAuth.id,
  );
  // Verify token uniqueness across all refreshes
  TestValidator.notEquals(
    "third refresh token differs from second",
    thirdRefreshAuth.token.refresh,
    secondRefreshRefreshToken,
  );
}
