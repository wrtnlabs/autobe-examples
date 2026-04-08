import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that banned sellers are blocked from logging into the platform.
 *
 * Validates the security aspect of the ban feature, ensuring that when an administrator bans a seller account, the seller cannot authenticate with their valid credentials. After unbanning, the seller should be able to login immediately without re-registration.
 *
 * Special attention is given to verifying that the ban action properly prevents authentication while preserving the seller's account data, and that unban restores full platform access.
 *
 * 1. Administrator authenticates to gain administrative privileges.
 * 2. A new seller account is registered with email and password.
 * 3. Seller logs in successfully before ban to verify credentials work.
 * 4. Administrator bans the seller using the ban toggle endpoint.
 * 5. Response is validated to confirm is_banned=true.
 * 6. Seller attempts login with valid credentials.
 * 7. Login is expected to fail with 403 Forbidden status.
 * 8. Administrator unbans the seller using the ban toggle endpoint.
 * 9. Response is validated to confirm is_banned=false.
 * 10. Seller logs in again successfully after unban.
 * 11. Authentication tokens are verified to be issued correctly.
 */
export async function test_api_seller_ban_login_blocking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin_ban_test@test.com",
      password: "AdminPass123",
    },
  });
  // 2. Create a seller account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: "seller_ban_test@test.com",
      password: "SellerPass123",
    },
  });
  typia.assert(sellerJoin);
  const sellerId = sellerJoin.id;
  const sellerEmail = sellerJoin.email;
  const sellerPassword = "SellerPass123";
  // 3. Verify seller can login successfully before ban
  const sellerBeforeBanConnection: api.IConnection = { host: connection.host };
  const sellerBeforeBan = await authorize_seller_login(
    sellerBeforeBanConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: "https://test.com/login",
        referrer: "https://test.com",
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(sellerBeforeBan);
  TestValidator.equals(
    "seller can login before ban",
    sellerBeforeBan.banned,
    false,
  );
  // 4. Administrator bans the seller
  const banResponse =
    await api.functional.shoppingMall.administrator.sellers.ban.toggleBan(
      adminConnection,
      {
        sellerId: sellerId,
        body: { action: "ban" } satisfies IShoppingMallSeller.IBanAction,
      },
    );
  typia.assert(banResponse);
  // 5. Verify response confirms is_banned=true
  TestValidator.equals(
    "seller is banned after ban action",
    banResponse.is_banned,
    true,
  );
  // 6. Attempt seller login with valid credentials
  const sellerLoginAfterBanConnection: api.IConnection = {
    host: connection.host,
  };
  // 7. Verify login returns 403 Forbidden with ban notification
  await TestValidator.httpError(
    "banned seller cannot login",
    403,
    async () =>
      await authorize_seller_login(sellerLoginAfterBanConnection, {
        body: {
          email: sellerEmail,
          password: sellerPassword,
          href: "https://test.com/login",
          referrer: "https://test.com",
        } satisfies IShoppingMallSeller.ILogin,
      }),
  );
  // 8. Administrator unbans the seller
  const unbanResponse =
    await api.functional.shoppingMall.administrator.sellers.ban.toggleBan(
      adminConnection,
      {
        sellerId: sellerId,
        body: { action: "unban" } satisfies IShoppingMallSeller.IBanAction,
      },
    );
  typia.assert(unbanResponse);
  // 9. Verify response confirms is_banned=false
  TestValidator.equals(
    "seller is unbanned after unban action",
    unbanResponse.is_banned,
    false,
  );
  // 10. Attempt seller login again
  const sellerAfterUnbanConnection: api.IConnection = { host: connection.host };
  const sellerAfterUnban = await authorize_seller_login(
    sellerAfterUnbanConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: "https://test.com/login",
        referrer: "https://test.com",
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(sellerAfterUnban);
  // 11. Verify login succeeds and returns authentication tokens
  TestValidator.equals(
    "seller can login after unban",
    sellerAfterUnban.banned,
    false,
  );
  TestValidator.predicate(
    "has access token",
    sellerAfterUnban.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    sellerAfterUnban.token.refresh.length > 0,
  );
}
