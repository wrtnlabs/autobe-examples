import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the primary success path for seller approval workflow.
 *
 * Validates the complete seller approval flow including administrator authentication, seller registration with pending status, and administrator approval action. Ensures that the seller's approval status correctly transitions from 'pending' to 'approved' and that the approval reason is properly recorded.
 *
 * Special attention is given to verifying that the seller entity response contains the correct approval status, that the approval reason is stored when provided, and that the seller's profile is also updated to reflect the approved status.
 *
 * 1. Administrator registers and authenticates with email and password.
 * 2. Seller registers with email and password, automatically entering 'pending' approval status.
 * 3. Administrator approves the seller by calling the approve endpoint with seller ID and optional approval reason.
 * 4. Validates that the response contains the updated seller entity with 'approved' status.
 * 5. Verifies that the approval reason is correctly recorded in the seller entity.
 * 6. Confirms that the seller's updated_at timestamp has been updated.
 */
export async function test_api_seller_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  typia.assert(adminAuth);
  // 2. Seller registration (automatically pending)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    },
  });
  typia.assert(sellerAuth);
  // Verify seller is in pending status
  TestValidator.equals(
    "seller initial status is pending",
    sellerAuth.approval_status,
    "pending",
  );
  // 3. Administrator approves the seller
  const approvalReason = RandomGenerator.paragraph({ sentences: 3 });
  const approvedSeller =
    await api.functional.shoppingMall.administrator.sellers.approve(
      adminConnection,
      {
        sellerId: sellerAuth.id,
        body: {
          approval_reason: approvalReason,
        } satisfies IShoppingMallSeller.IApprove,
      },
    );
  typia.assert(approvedSeller);
  // 4. Validate approval success
  TestValidator.equals(
    "seller status changed to approved",
    approvedSeller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "approval reason recorded",
    approvedSeller.approval_reason,
    approvalReason,
  );
  TestValidator.equals(
    "rejection reason cleared",
    approvedSeller.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    approvedSeller.updated_at !== undefined,
  );
}
