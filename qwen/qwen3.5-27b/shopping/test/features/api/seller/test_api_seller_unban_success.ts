import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the primary success path for seller unban operation.
 * 1. Authenticate as administrator
 * 2. Create a seller account
 * 3. Ban the seller account
 * 4. Unban the seller account
 * 5. Verify status change and login capability
 */
export async function test_api_seller_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  typia.assert(adminAuth);
  // 2. Create a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
    },
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  const sellerEmail = sellerAuth.email;
  const sellerPassword = "1234";
  const originalApprovalStatus = sellerAuth.approval_status;
  const originalShopName = sellerAuth.shop_name;
  const originalShopDescription = sellerAuth.shop_description;
  const originalLogoImage = sellerAuth.logo_image;
  // 3. Ban the seller account
  const bannedSeller = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    {
      sellerId,
    },
  );
  typia.assert(bannedSeller);
  TestValidator.equals("seller is banned", bannedSeller.status, "banned");
  TestValidator.equals("seller ID preserved", bannedSeller.id, sellerId);
  // 4. Unban the seller account
  const unbannedSeller = await api.functional.shoppingMall.admin.sellers.unban(
    adminConnection,
    {
      sellerId,
    },
  );
  typia.assert(unbannedSeller);
  // 5. Verify status change and data preservation
  TestValidator.equals(
    "seller status is active after unban",
    unbannedSeller.status,
    "active",
  );
  TestValidator.equals("seller ID preserved", unbannedSeller.id, sellerId);
  TestValidator.equals(
    "approval_status unchanged",
    unbannedSeller.approval_status,
    originalApprovalStatus,
  );
  TestValidator.equals(
    "shop_name preserved",
    unbannedSeller.shop_name,
    originalShopName,
  );
  TestValidator.equals(
    "shop_description preserved",
    unbannedSeller.shop_description,
    originalShopDescription,
  );
  TestValidator.equals(
    "logo_image preserved",
    unbannedSeller.logo_image,
    originalLogoImage,
  );
  TestValidator.equals("email preserved", unbannedSeller.email, sellerEmail);
  // 6. Verify seller can login after unban
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(sellerLoginResult);
  TestValidator.equals(
    "login successful after unban",
    sellerLoginResult.id,
    sellerId,
  );
  TestValidator.equals(
    "login status is active",
    sellerLoginResult.status,
    "active",
  );
}
