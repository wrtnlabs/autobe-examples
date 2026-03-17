import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApproval";
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

export async function test_api_seller_approval_duplicate_decision_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. As the seller, submit a seller approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  // 4. As the super admin, retrieve the pending approval record
  const approvalListPage =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalListPage);
  // Find the specific approval we just created
  const pendingApproval = approvalListPage.data.find(
    (item) => item.id === approval.id,
  );
  TestValidator.predicate(
    "pending approval record should be found",
    pendingApproval !== undefined,
  );
  const approvalId = approval.id;
  // 5. First decision: approve the seller (should succeed)
  const firstDecision =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.update(
      superAdminConnection,
      {
        approvalId,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(firstDecision);
  TestValidator.equals(
    "first decision status is approved",
    firstDecision.status,
    "approved",
  );
  // 6. Second decision: attempt to reject an already-approved record (should fail with 422)
  await TestValidator.httpError(
    "duplicate decision on already-decided approval should return 422",
    422,
    async () => {
      await api.functional.shoppingMall.superAdmin.sellerApprovals.update(
        superAdminConnection,
        {
          approvalId,
          body: {
            status: "rejected",
            rejection_reason:
              "Attempting a second decision on an already-decided record.",
          } satisfies IShoppingMallSellerApproval.IUpdate,
        },
      );
    },
  );
}
