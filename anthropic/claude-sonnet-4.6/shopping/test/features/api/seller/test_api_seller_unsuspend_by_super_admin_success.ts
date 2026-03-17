import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_seller_unsuspend_by_super_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin registers and authenticates
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Seller registers and authenticates
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
  // 4. Super admin approves the seller
  const approvedApproval =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.update(
      superAdminConnection,
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
  // 5. Super admin suspends the seller
  const suspendedSeller =
    await api.functional.shoppingMall.superAdmin.sellers.suspend(
      superAdminConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(suspendedSeller);
  TestValidator.equals(
    "seller is suspended",
    suspendedSeller.isSuspended,
    true,
  );
  // Record updatedAt timestamp after suspension
  const suspendedUpdatedAt = suspendedSeller.updatedAt;
  // 6. Super admin unsuspends the seller (target operation)
  const unsuspendedSeller =
    await api.functional.shoppingMall.superAdmin.sellers.unsuspend(
      superAdminConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(unsuspendedSeller);
  // 7. Validate the results
  TestValidator.equals(
    "isSuspended is false after unsuspend",
    unsuspendedSeller.isSuspended,
    false,
  );
  TestValidator.equals(
    "isBanned remains false",
    unsuspendedSeller.isBanned,
    false,
  );
  TestValidator.equals("deletedAt is null", unsuspendedSeller.deletedAt, null);
  TestValidator.equals("seller id unchanged", unsuspendedSeller.id, sellerId);
  TestValidator.equals(
    "seller email unchanged",
    unsuspendedSeller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "seller shopName unchanged",
    unsuspendedSeller.shopName,
    sellerShopName,
  );
  TestValidator.predicate(
    "updatedAt after unsuspend is more recent than after suspend",
    new Date(unsuspendedSeller.updatedAt) >= new Date(suspendedUpdatedAt),
  );
}
