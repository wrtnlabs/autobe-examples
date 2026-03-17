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

export async function test_api_seller_approval_reject_pending_registration_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register a new seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuthorized);
  // 3. As seller, submit an approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  // 4. As super admin, retrieve the pending approval list to get the approvalId
  const approvalList =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalList);
  // Find the approval record for the registered seller
  const targetApproval = approvalList.data.find(
    (item) => item.seller.id === sellerAuthorized.id,
  );
  TestValidator.predicate(
    "pending approval found for the registered seller",
    targetApproval !== undefined,
  );
  const approvalId = targetApproval!.id;
  // 5. As super admin, reject the pending approval with a reason
  const rejectionReason =
    "Your registration did not meet our platform requirements. Please provide a valid business address and resubmit.";
  const rejectedApproval =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.update(
      superAdminConnection,
      {
        approvalId,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(rejectedApproval);
  // 6. Validate the rejected approval
  TestValidator.equals(
    "approval status is rejected",
    rejectedApproval.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedApproval.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at is non-null",
    rejectedApproval.reviewed_at !== null,
  );
  TestValidator.equals(
    "seller id matches",
    rejectedApproval.seller.id,
    sellerAuthorized.id,
  );
  // 7. Validate that the rejected seller can resubmit a new registration request
  const resubmittedApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerConnection,
      {},
    );
  typia.assert(resubmittedApproval);
  TestValidator.equals(
    "resubmitted approval status is pending",
    resubmittedApproval.status,
    "pending",
  );
  TestValidator.predicate(
    "resubmitted approval is a new record",
    resubmittedApproval.id !== approvalId,
  );
}
