import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test retrieving a specific seller approval record that is in pending status after initial seller registration.
 *
 * Validates the complete flow of viewing a pending approval record after new seller registration. The test verifies that:
 * 1. A seller can register and receive a pending approval status
 * 2. The seller can authenticate and retrieve their pending approval details
 * 3. The approval record contains correct pending status with null rejection details
 * 4. The approval includes proper timestamps and history
 *
 * **Test Flow:**
 * 1. Register a new seller account via POST /auth/seller/join with valid email and password
 * 2. Authenticate the seller via POST /auth/seller/login to obtain JWT tokens
 * 3. Extract the pending approvalId from the authorization response
 * 4. Retrieve the specific approval record via GET /seller/sellers/me/approvals/{approvalId}
 *
 * **Expected Validations:**
 * - approvalStatus should be 'pending' (not yet reviewed)
 * - rejectionReason should be null (no rejection occurred)
 * - rejectedAt should be null (no rejection occurred)
 * - approvalHistory should contain at least one record (the pending one)
 * - Each history item should have valid timestamps and seller reference
 */
export async function test_api_seller_approval_view_pending_record(
  connection: api.IConnection,
): Promise<void> {
  // Generate seller credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  // 1. Register a new seller account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(joinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Authenticate the seller to obtain JWT tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(loginResult);
  // 3. Extract the pending approvalId from the authorization response
  const pendingApproval = loginResult.sellerApprovals.find(
    (approval) => approval.status === "pending",
  );
  TestValidator.predicate(
    "pending approval record exists in authorization response",
    pendingApproval !== undefined,
  );
  const approvalId = pendingApproval!.id;
  // 4. Retrieve the specific approval record
  const approval =
    await api.functional.ecommerceMall.seller.sellers.me.approvals.at(
      loginConnection,
      {
        approvalId: approvalId,
      },
    );
  typia.assert(approval);
  // 5. Validate the approval record
  TestValidator.equals(
    "approvalStatus should be pending",
    approval.approvalStatus,
    "pending",
  );
  TestValidator.equals(
    "rejectionReason should be null",
    approval.rejectionReason,
    null,
  );
  TestValidator.equals("rejectedAt should be null", approval.rejectedAt, null);
  TestValidator.predicate(
    "approvalHistory should contain at least the current pending record",
    approval.approvalHistory.length >= 1,
  );
  // Validate first history item has required fields
  const firstHistoryItem = approval.approvalHistory[0];
  TestValidator.equals(
    "first history item status should be pending",
    firstHistoryItem.status,
    "pending",
  );
  TestValidator.equals(
    "first history item id should match approvalId",
    firstHistoryItem.id,
    approvalId,
  );
  TestValidator.predicate(
    "first history item created_at should be present",
    firstHistoryItem.created_at !== undefined &&
      firstHistoryItem.created_at !== null,
  );
  TestValidator.predicate(
    "first history item updated_at should be present",
    firstHistoryItem.updated_at !== undefined &&
      firstHistoryItem.updated_at !== null,
  );
  TestValidator.predicate(
    "first history item seller reference should exist",
    firstHistoryItem.seller !== undefined && firstHistoryItem.seller !== null,
  );
  TestValidator.equals(
    "first history item seller email should match",
    firstHistoryItem.seller.email,
    sellerEmail,
  );
}
