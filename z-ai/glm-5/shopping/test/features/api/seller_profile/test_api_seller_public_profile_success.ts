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

export async function test_api_seller_public_profile_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful retrieval of an approved seller's public profile.
   *
   * This test validates that:
   * 1. A seller can be created and approved
   * 2. The public profile endpoint returns valid seller information
   * 3. The returned profile matches the seller's shop details
   */
  // Step 1: Create a seller account with shop profile information
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_url: typia.random<string & tags.Format<"url">>(),
    },
  });
  typia.assert(seller);
  // Step 2: Create an admin account to approve the seller
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Step 3: Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // Step 4: Retrieve the seller's public profile
  const publicProfile = await api.functional.shoppingMall.sellers.at(
    connection,
    { sellerId: seller.id },
  );
  typia.assert(publicProfile);
  // Step 5: Validate the public profile contains expected shop information
  TestValidator.equals("seller ID matches", publicProfile.id, seller.id);
  TestValidator.equals(
    "shop name matches",
    publicProfile.shopName,
    seller.shopName,
  );
  TestValidator.equals(
    "shop description matches",
    publicProfile.shopDescription,
    seller.shopDescription,
  );
  TestValidator.equals(
    "logo URL matches",
    publicProfile.logoUrl,
    seller.logoUrl,
  );
  TestValidator.equals(
    "seller is approved",
    publicProfile.approvalStatus,
    "approved",
  );
}
