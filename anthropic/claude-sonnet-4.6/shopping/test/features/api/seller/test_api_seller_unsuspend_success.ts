import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
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
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_seller_unsuspend_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin and set up admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register seller and set up seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  const sellerEmail = sellerAuth.email;
  const sellerShopName = sellerAuth.shopName;
  // 3. Seller submits an approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  // 4. Admin approves the seller registration
  const approvedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedApproval);
  TestValidator.equals(
    "approval status is approved",
    approvedApproval.status,
    "approved",
  );
  // 5. Admin suspends the seller
  const suspendedSeller =
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId,
    });
  typia.assert(suspendedSeller);
  TestValidator.equals(
    "seller is suspended",
    suspendedSeller.isSuspended,
    true,
  );
  TestValidator.equals("seller is not banned", suspendedSeller.isBanned, false);
  const suspendedUpdatedAt = suspendedSeller.updatedAt;
  // 6. Admin unsuspends the seller
  const unsuspendedSeller =
    await api.functional.shoppingMall.admin.sellers.unsuspend(adminConnection, {
      sellerId,
    });
  typia.assert(unsuspendedSeller);
  // Validate unsuspension results
  TestValidator.equals(
    "seller is not suspended after unsuspend",
    unsuspendedSeller.isSuspended,
    false,
  );
  TestValidator.equals(
    "seller is not banned",
    unsuspendedSeller.isBanned,
    false,
  );
  TestValidator.equals("seller id unchanged", unsuspendedSeller.id, sellerId);
  TestValidator.equals(
    "seller email unchanged",
    unsuspendedSeller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "seller shop name unchanged",
    unsuspendedSeller.shopName,
    sellerShopName,
  );
  TestValidator.predicate(
    "updatedAt is more recent after unsuspension",
    unsuspendedSeller.updatedAt >= suspendedUpdatedAt,
  );
}
