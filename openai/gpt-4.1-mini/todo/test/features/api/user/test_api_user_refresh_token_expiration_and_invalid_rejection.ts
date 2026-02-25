import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_refresh_token_expiration_and_invalid_rejection(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test refresh token expiration and invalid token rejection.
   *
   * This test will cover the scenario where a user attempts to use an expired
   * or invalid refresh token to obtain new JWT tokens. The system should reject
   * these attempts with HTTP 401 Unauthorized status and no new tokens should
   * be issued.
   *
   * Steps:
   * 1. Register a new user using authorize_user_join.
   * 2. Attempt to refresh tokens with an expired token (simulate with a known
   *    malformed or expired token string).
   * 3. Attempt to refresh tokens with a completely malformed token string.
   * 4. Verify that both attempts are rejected with HTTP 401 error status.
   */
  // Create user connection and register user with join
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: `test+${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IMultiUserTodoUser.IJoin,
  });
  typia.assert(user);
  // Prepare expired refresh token string (simulate)
  // Since we cannot generate a real expired token, use an obviously invalid token string that should cause rejection
  const expiredRefreshToken = "expired-refresh-token-example-invalid";
  // Try refreshing with expired refresh token
  await TestValidator.httpError(
    "refresh token expired rejected",
    401,
    async () => {
      await authorize_user_refresh(userConnection, {
        body: {
          refresh: expiredRefreshToken,
        } satisfies IMultiUserTodoUser.IRefresh,
      });
    },
  );
  // Prepare malformed refresh token string
  const malformedRefreshToken = "malformed-token-@@@###$$$";
  // Try refreshing with malformed token
  await TestValidator.httpError(
    "refresh token malformed rejected",
    401,
    async () => {
      await authorize_user_refresh(userConnection, {
        body: {
          refresh: malformedRefreshToken,
        } satisfies IMultiUserTodoUser.IRefresh,
      });
    },
  );
}
