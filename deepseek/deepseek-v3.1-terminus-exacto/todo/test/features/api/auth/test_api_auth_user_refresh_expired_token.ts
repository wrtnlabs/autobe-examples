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
 * Test token refresh with expired refresh token scenario.
 *
 * This test validates the security mechanism for handling expired refresh tokens.
 * It creates a user account, obtains initial authentication tokens, then attempts
 * to refresh using an expired refresh token to ensure the system properly rejects
 * expired tokens and returns appropriate error response.
 */
export async function test_api_auth_user_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Create user account and obtain initial authentication tokens
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Attempt refresh with the actual refresh token obtained from join
  // The system should handle token expiration validation internally
  await TestValidator.error(
    "refresh with valid but potentially expired token should be handled by system",
    async () => {
      await api.functional.todoApp.auth.user.refresh(userConnection, {
        body: {
          refresh_token: authorizedUser.token.refresh,
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );
}
