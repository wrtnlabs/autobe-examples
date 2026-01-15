import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_token_refresh_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize admin join to establish initial session with refresh token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/signup",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCreds },
  );
  typia.assert(admin);
  // Step 2: Extract the original access token for comparison
  const originalAccessToken = admin.token.access;
  const originalExpiredAt = admin.token.expired_at;
  const originalRefreshToken = admin.token.refresh;
  const originalRefreshableUntil = admin.token.refreshable_until;
  // Step 3: Call the refresh endpoint using the same connection (refresh token is stored in httpOnly cookie)
  // The authorize_admin_refresh utility function will automatically use the refresh token from the cookie
  const refreshed: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_refresh(adminConnection, { body: { token: originalRefreshToken } });
  typia.assert(refreshed);
  // Step 4: Validate that the refresh was successful
  // Verify that a new access token was issued
  TestValidator.notEquals(
    "new access token issued",
    refreshed.token.access,
    originalAccessToken,
  );
  // Verify that the refresh token remains unchanged (same refresh token is preserved)
  TestValidator.equals(
    "refresh token unchanged",
    refreshed.token.refresh,
    originalRefreshToken,
  );
  // Verify that the admin information remains the same
  TestValidator.equals("admin id unchanged", refreshed.id, admin.id);
  TestValidator.equals("admin email unchanged", refreshed.email, admin.email);
  TestValidator.equals("admin name unchanged", refreshed.name, admin.name);
  // Verify that the expired_at timestamp has been updated (new access token with 15-minute expiration)
  TestValidator.notEquals(
    "access token expired_at updated",
    refreshed.token.expired_at,
    originalExpiredAt,
  );
  // Verify that the refresh token refreshable_until timestamp remains unchanged (same expiry)
  TestValidator.equals(
    "refresh token refreshable_until unchanged",
    refreshed.token.refreshable_until,
    originalRefreshableUntil,
  );
}