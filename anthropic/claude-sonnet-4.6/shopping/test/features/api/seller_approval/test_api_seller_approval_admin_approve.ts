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

export async function test_api_seller_approval_admin_approve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // 2. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  // 3. Seller submits a seller approval request (pending)
  const pendingApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(pendingApproval);
  // Validate the initial state: status is 'pending', reviewed_at and reviewed_by are null
  TestValidator.equals(
    "initial status is pending",
    pendingApproval.status,
    "pending",
  );
  TestValidator.equals(
    "reviewed_at is null initially",
    pendingApproval.reviewed_at,
    null,
  );
  TestValidator.equals(
    "reviewed_by is null initially",
    pendingApproval.reviewed_by,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null initially",
    pendingApproval.rejection_reason,
    null,
  );
  // 4. Admin approves the pending approval
  const approvedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: pendingApproval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedApproval);
  // Validations
  TestValidator.equals(
    "status is approved",
    approvedApproval.status,
    "approved",
  );
  TestValidator.equals(
    "rejection_reason is null for approval",
    approvedApproval.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "reviewed_at is non-null",
    approvedApproval.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewed_by is non-null",
    approvedApproval.reviewed_by !== null,
  );
  TestValidator.equals(
    "seller id matches",
    approvedApproval.seller.id,
    sellerAuthorized.seller.id,
  );
  TestValidator.equals(
    "submitted_at unchanged",
    approvedApproval.submitted_at,
    pendingApproval.submitted_at,
  );
  // Validate that reviewed_by admin id matches the reviewing admin's id
  if (approvedApproval.reviewed_by !== null) {
    TestValidator.equals(
      "reviewed_by id matches admin id",
      approvedApproval.reviewed_by.id,
      adminAuthorized.admin.id,
    );
  }
}
