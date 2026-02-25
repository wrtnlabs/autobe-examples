import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refresh_with_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt token refresh with expired or invalid refresh token.
  // Steps:
  // 1) Administrator registers (join) to obtain valid tokens.
  // 2) Modify or use expired refresh token in refresh request.
  // 3) Expect failure response indicating token invalidity or session expiration.
  // 4) Verify proper error handling and refusal to issue new tokens.
  // 1. Administrator registration
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
      },
    },
  );
  typia.assert(adminAuthorized);
  // 2. Prepare refresh connection and altered (expired/invalid) refresh token
  const adminRefreshConnection: api.IConnection = { host: connection.host };
  // Compose an invalid/expired refresh token by altering the valid one
  // Here, simulate by appending garbage to valid token to invalidate it
  const invalidRefreshToken = adminAuthorized.token.refresh + "_expired";
  // 3. Attempt token refresh and expect an error
  await TestValidator.error(
    "token refresh fails with expired or invalid refresh token",
    async () => {
      // Use utility authorize_administrator_refresh to trigger refresh
      await authorize_administrator_refresh(adminRefreshConnection, {
        body: {
          refreshToken: invalidRefreshToken,
        },
      });
    },
  );
}
