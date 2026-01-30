import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_refresh_token_revoked(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new user account with generated password
  const userConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(12);
  const userJoinResponse = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
    },
  });
  typia.assert(userJoinResponse);
  // Step 2: Authenticate user and obtain initial tokens using the same password
  const authConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_user_login(authConnection, {
    body: {
      email: userJoinResponse.email,
      password,
    },
  });
  typia.assert(authResponse);
  // Step 3: Perform one successful refresh to get new tokens and revoke old one
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_user_refresh(refreshConnection, {
    body: {
      refresh_token: authResponse.token.refresh,
    },
  });
  typia.assert(refreshResponse);
  // Step 4: Attempt to reuse the revoked refresh token
  const revokedRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("revoked refresh token should reject", async () => {
    await authorize_user_refresh(revokedRefreshConnection, {
      body: {
        refresh_token: authResponse.token.refresh, // This refresh token has been revoked
      },
    });
  });
  // Step 5: Verify user can re-authenticate with credentials
  const reAuthConnection: api.IConnection = { host: connection.host };
  const reAuthResponse = await authorize_user_login(reAuthConnection, {
    body: {
      email: userJoinResponse.email,
      password,
    },
  });
  typia.assert(reAuthResponse);
  // Validate that the new refresh token is different from the revoked one
  TestValidator.notEquals(
    "new refresh token should be different from revoked token",
    refreshResponse.token.refresh,
    reAuthResponse.token.refresh,
  );
}
