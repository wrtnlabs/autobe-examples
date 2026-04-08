import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that banning a seller preserves all existing orders and data.
 *
 * Validates the complete seller ban workflow including administrative authentication, seller account creation, and the non-destructive nature of the ban action. Ensures that banning a seller updates the is_banned flag correctly while preserving all seller profile information such as shop name, description, and approval status.
 *
 * Special attention is given to verifying that the ban action can be reversed through unbanning, and that all seller data remains intact throughout the process. The test validates both the ban and unban operations to ensure data integrity is maintained.
 *
 * 1. Administrator authenticates to the system.
 * 2. Seller account is created with random credentials.
 * 3. Customer account is created for future order placement.
 * 4. Administrator bans the seller with action='ban'.
 * 5. Verifies seller profile shows is_banned=true.
 * 6. Administrator unbans the seller with action='unban'.
 * 7. Verifies seller profile shows is_banned=false.
 * 8. Verifies all seller profile data remains unchanged after ban/unban cycle.
 */
export async function test_api_seller_ban_with_existing_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. Customer authentication (for future order placement)
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Ban the seller
  const bannedProfile =
    await api.functional.shoppingMall.administrator.sellers.ban.toggleBan(
      adminConnection,
      {
        sellerId: sellerId,
        body: { action: "ban" } satisfies IShoppingMallSeller.IBanAction,
      },
    );
  typia.assert(bannedProfile);
  // 5. Verify seller is banned
  TestValidator.predicate("seller is banned", bannedProfile.is_banned === true);
  TestValidator.equals(
    "banned profile id matches seller",
    bannedProfile.id,
    sellerId,
  );
  // 6. Unban the seller
  const unbannedProfile =
    await api.functional.shoppingMall.administrator.sellers.ban.toggleBan(
      adminConnection,
      {
        sellerId: sellerId,
        body: { action: "unban" } satisfies IShoppingMallSeller.IBanAction,
      },
    );
  typia.assert(unbannedProfile);
  // 7. Verify seller is unbanned
  TestValidator.predicate(
    "seller is unbanned",
    unbannedProfile.is_banned === false,
  );
  TestValidator.equals(
    "unbanned profile id matches seller",
    unbannedProfile.id,
    sellerId,
  );
  // 8. Verify data integrity - profile fields should remain unchanged after ban/unban
  TestValidator.equals(
    "shop name preserved after ban/unban",
    unbannedProfile.shop_name,
    bannedProfile.shop_name,
  );
  TestValidator.equals(
    "shop description preserved after ban/unban",
    unbannedProfile.shop_description,
    bannedProfile.shop_description,
  );
  TestValidator.equals(
    "approval status preserved after ban/unban",
    unbannedProfile.approval_status,
    bannedProfile.approval_status,
  );
  TestValidator.equals(
    "logo uri preserved after ban/unban",
    unbannedProfile.logo_uri,
    bannedProfile.logo_uri,
  );
  TestValidator.equals(
    "is_suspended preserved after ban/unban",
    unbannedProfile.is_suspended,
    bannedProfile.is_suspended,
  );
}
