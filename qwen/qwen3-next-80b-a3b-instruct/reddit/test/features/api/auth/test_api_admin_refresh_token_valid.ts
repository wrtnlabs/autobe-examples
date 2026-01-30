import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_refresh_token_valid(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account using authorize_admin_join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(adminUser);
  // Step 2: Extract the refresh token from the admin user's token
  const refreshToken: string = adminUser.token.refresh;
  typia.assert(refreshToken);
  // Step 3: Create a new connection to refresh the token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAdmin: ICommunityBbsAdmin.IAuthorized =
    await authorize_admin_refresh(refreshConnection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ICommunityBbsAdmin.IRefresh,
    });
  typia.assert(refreshedAdmin);
  // Step 4: Validate that the refresh operation was successful
  // Verify the new access token is valid and has the correct expiration (15 minutes)
  TestValidator.equals(
    "refreshed admin ID matches original",
    refreshedAdmin.id,
    adminUser.id,
  );
  TestValidator.equals(
    "refreshed username matches original",
    refreshedAdmin.username,
    adminUser.username,
  );
  TestValidator.equals(
    "refreshed email matches original",
    refreshedAdmin.email,
    adminUser.email,
  );
  // Verify the refresh token remains unchanged
  TestValidator.equals(
    "refresh token unchanged",
    refreshedAdmin.token.refresh,
    refreshToken,
  );
  // Verify new access token is different from original
  TestValidator.notEquals(
    "new access token different from original",
    refreshedAdmin.token.access,
    adminUser.token.access,
  );
  // Verify access token expiration is approximately 15 minutes from now (not from original token)
  const refreshTime = new Date();
  const newExpireDate = new Date(refreshedAdmin.token.expired_at);
  const timeDiffMs = newExpireDate.getTime() - refreshTime.getTime();
  const timeDiffMinutes = timeDiffMs / (1000 * 60);
  TestValidator.predicate(
    "new access token expires within 15 minutes",
    timeDiffMinutes >= 14 && timeDiffMinutes <= 16,
  );
  // Verify refreshable_until is unchanged (still 7 days from original)
  const originalRefreshableUntil = new Date(adminUser.token.refreshable_until);
  const newRefreshableUntil = new Date(refreshedAdmin.token.refreshable_until);
  TestValidator.equals(
    "refreshable until unchanged",
    newRefreshableUntil.getTime(),
    originalRefreshableUntil.getTime(),
  );
}
