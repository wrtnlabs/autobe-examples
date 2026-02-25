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

export async function test_api_seller_reapply_with_profile_update(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller reapplication with optional shop profile updates.
   * Scenario:
   * 1) Admin registers
   * 2) Seller registers with initial profile
   * 3) Admin rejects seller with reason indicating issues with shop information
   * 4) Seller reapplies with updated shopName, shopDescription, and logoUrl
   * 5) Validate that the profile updates are persisted alongside the status change
   */
  // 1. Admin registers
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Seller registers with initial profile
  const sellerConnection: api.IConnection = { host: connection.host };
  const initialShopName = RandomGenerator.name();
  const initialShopDescription = RandomGenerator.paragraph({ sentences: 2 });
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: initialShopName,
      shop_description: initialShopDescription,
    },
  });
  typia.assert(seller);
  const sellerId = seller.id;
  // 3. Admin rejects seller with feedback about shop profile
  const rejectionReason =
    "Shop name is too generic and description is insufficient. Please provide a more descriptive shop name and detailed description of your business.";
  const rejectedSeller = await api.functional.shoppingMall.admin.sellers.reject(
    adminConnection,
    {
      sellerId,
      body: {
        reason: rejectionReason,
      } satisfies IShoppingMallSeller.IReject,
    },
  );
  typia.assert(rejectedSeller);
  // Verify seller is rejected
  TestValidator.equals(
    "approval status is rejected",
    rejectedSeller.approvalStatus,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason stored",
    rejectedSeller.rejectionReason,
    rejectionReason,
  );
  // 4. Seller reapply with updated profile
  const updatedShopName = `${initialShopName} Premium Store`;
  const updatedShopDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedLogoUrl = "https://example.com/logo.png";
  const reappliedSeller = await api.functional.shoppingMall.seller.reapply(
    sellerConnection,
    {
      body: {
        shopName: updatedShopName,
        shopDescription: updatedShopDescription,
        logoUrl: updatedLogoUrl,
      } satisfies IShoppingMallSeller.IReapply,
    },
  );
  typia.assert(reappliedSeller);
  // 5. Validate profile updates are persisted
  TestValidator.equals(
    "shop name updated",
    reappliedSeller.shopName,
    updatedShopName,
  );
  TestValidator.equals(
    "shop description updated",
    reappliedSeller.shopDescription,
    updatedShopDescription,
  );
  TestValidator.equals(
    "logo url updated",
    reappliedSeller.logoUrl,
    updatedLogoUrl,
  );
  TestValidator.equals(
    "approval status is pending",
    reappliedSeller.approvalStatus,
    "pending",
  );
  TestValidator.equals(
    "rejection reason cleared",
    reappliedSeller.rejectionReason,
    null,
  );
}
