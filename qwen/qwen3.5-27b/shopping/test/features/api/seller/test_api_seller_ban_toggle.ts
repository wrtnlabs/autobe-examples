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
 * Test the administrator's ability to ban and unban seller accounts.
 *
 * Validates the complete seller ban/unban workflow including administrator authentication, seller account creation, ban status toggling, and authentication blocking. Ensures that banned sellers cannot log in while their data is preserved, and unbanned sellers regain full platform access.
 *
 * Special attention is given to verifying that the ban status is correctly reflected in both the seller account and seller profile, and that authentication is properly blocked for banned sellers.
 *
 * 1. Administrator authenticates using join operation.
 * 2. Seller account is created with randomized credentials.
 * 3. Administrator bans the seller with action='ban'.
 * 4. Response validates is_banned=true in seller profile.
 * 5. Seller login attempt fails due to ban status.
 * 6. Administrator unbans the seller with action='unban'.
 * 7. Response validates is_banned=false in seller profile.
 * 8. Seller login succeeds after unban.
 */
export async function test_api_seller_ban_toggle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create seller account with explicit password
  const sellerPassword: string = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      password: sellerPassword,
    },
  });
  typia.assert(seller);
  const sellerId: string & tags.Format<"uuid"> = seller.id;
  const sellerEmail: string & tags.Format<"email"> = seller.email;
  // 3. Ban the seller
  const bannedProfile =
    await api.functional.shoppingMall.administrator.sellers.ban.toggleBan(
      adminConnection,
      {
        sellerId,
        body: { action: "ban" } satisfies IShoppingMallSeller.IBanAction,
      },
    );
  typia.assert(bannedProfile);
  // 4. Verify seller profile shows is_banned=true
  TestValidator.equals(
    "seller profile is_banned",
    bannedProfile.is_banned,
    true,
  );
  // 5. Verify seller cannot login when banned
  const bannedSellerConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "banned seller cannot login",
    [401, 403],
    async () => {
      await authorize_seller_login(bannedSellerConnection, {
        body: {
          email: sellerEmail,
          password: sellerPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );
  // 6. Unban the seller
  const unbannedProfile =
    await api.functional.shoppingMall.administrator.sellers.ban.toggleBan(
      adminConnection,
      {
        sellerId,
        body: { action: "unban" } satisfies IShoppingMallSeller.IBanAction,
      },
    );
  typia.assert(unbannedProfile);
  // 7. Verify seller profile shows is_banned=false
  TestValidator.equals(
    "seller profile is_banned after unban",
    unbannedProfile.is_banned,
    false,
  );
  // 8. Verify seller can login after unban
  const unbannedSellerConnection: api.IConnection = { host: connection.host };
  const unbannedSeller = await authorize_seller_login(
    unbannedSellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(unbannedSeller);
  // Verify seller data is preserved
  TestValidator.equals("seller id preserved", unbannedSeller.id, sellerId);
  TestValidator.equals(
    "seller email preserved",
    unbannedSeller.email,
    sellerEmail,
  );
}
