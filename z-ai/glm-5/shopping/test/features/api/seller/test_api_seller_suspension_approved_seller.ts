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

export async function test_api_seller_suspension_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Step 2: Seller registers (status becomes 'pending')
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  const sellerEmail = sellerAuth.email;
  const sellerShopName = sellerAuth.shopName;
  // Step 3: Admin approves the seller (status changes to 'approved')
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "approved seller status",
    approvedSeller.approvalStatus,
    "approved",
  );
  // Step 4: Admin suspends the seller
  const suspendedSeller =
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId,
    });
  typia.assert(suspendedSeller);
  // Validation: approvalStatus should be 'suspended'
  TestValidator.equals(
    "suspended seller status",
    suspendedSeller.approvalStatus,
    "suspended",
  );
  // Validation: seller properties should remain unchanged
  TestValidator.equals("seller id unchanged", suspendedSeller.id, sellerId);
  TestValidator.equals(
    "seller email unchanged",
    suspendedSeller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "seller shopName unchanged",
    suspendedSeller.shopName,
    sellerShopName,
  );
  // Validation: updated_at should reflect suspension time (should be different from created_at)
  TestValidator.predicate(
    "updated_at changed",
    suspendedSeller.updatedAt !== suspendedSeller.createdAt,
  );
}
