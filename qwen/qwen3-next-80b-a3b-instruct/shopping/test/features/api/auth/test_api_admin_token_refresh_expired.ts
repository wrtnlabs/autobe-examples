import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_token_refresh_expired(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account to obtain initial token pair using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const initialToken: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      },
    });
  typia.assert(initialToken);
  // Step 2: Use the refresh_token from initial login to refresh the token
  // This creates a new access token and a new refresh token
  // The old refresh token is revoked by the server (security best practice)
  const refreshToken: IShoppingMallAdmin.IRefresh = {
    refresh_token: initialToken.token.refresh,
  };
  // Refresh the token using the utility function (not SDK)
  const refreshedToken: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_refresh(adminConnection, {
      body: refreshToken,
    });
  typia.assert(refreshedToken);
  // Step 3: Try to refresh again with the old refresh token (now revoked/expired)
  // This should fail with 401 Unauthorized as the refresh token is no longer valid
  await TestValidator.error(
    "refresh should fail with 401 when using revoked/expired refresh token",
    async () => {
      await authorize_admin_refresh(adminConnection, {
        body: refreshToken, // Try to use the now-revoked refresh token
      });
    },
  );
}
