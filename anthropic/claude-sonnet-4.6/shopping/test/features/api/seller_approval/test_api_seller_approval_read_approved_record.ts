import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApproval";
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

export async function test_api_seller_approval_read_approved_record(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller and get seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  // Step 2: Submit a new approval request as the seller
  const approvalCreated =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(approvalCreated);
  const approvalId = approvalCreated.id;
  const submittedAt = approvalCreated.submitted_at;
  // Step 3: Register a new admin and get admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // Step 4: As admin, approve the seller's pending approval
  const updatedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(updatedApproval);
  // Step 5: As seller, retrieve the approval record by ID
  const retrieved = await api.functional.shoppingMall.seller.approvals.at(
    sellerConnection,
    {
      approvalId,
    },
  );
  typia.assert(retrieved);
  // Validation: id matches the approvalId
  TestValidator.equals("approval id matches", retrieved.id, approvalId);
  // Validation: status is 'approved'
  TestValidator.equals(
    "approval status is approved",
    retrieved.status,
    "approved",
  );
  // Validation: rejection_reason is null for approved records
  TestValidator.equals(
    "rejection_reason is null",
    retrieved.rejection_reason,
    null,
  );
  // Validation: reviewed_at is non-null (set when admin approved)
  TestValidator.predicate(
    "reviewed_at is non-null",
    retrieved.reviewed_at !== null,
  );
  // Validation: reviewed_by is non-null (admin identity captured)
  TestValidator.predicate(
    "reviewed_by is non-null",
    retrieved.reviewed_by !== null,
  );
  // Validation: seller.id matches the authenticated seller's account
  TestValidator.equals(
    "seller id matches",
    retrieved.seller.id,
    sellerAuthorized.id,
  );
  // Validation: seller is not banned
  TestValidator.equals(
    "seller is not banned",
    retrieved.seller.isBanned,
    false,
  );
  // Validation: seller is not suspended
  TestValidator.equals(
    "seller is not suspended",
    retrieved.seller.isSuspended,
    false,
  );
  // Validation: submitted_at is preserved from original submission
  TestValidator.equals(
    "submitted_at preserved",
    retrieved.submitted_at,
    submittedAt,
  );
}
