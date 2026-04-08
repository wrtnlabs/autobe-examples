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
 * Test that an authenticated seller can retrieve their complete approval history without any filters.
 *
 * Validates the seller approval listing endpoint by first registering a new seller account which
 * automatically creates an initial pending approval record. Then calls the approvals endpoint with
 * an empty request body to retrieve all approval records without filters. Validates pagination
 * metadata structure (current, limit, records, pages) and verifies the data array contains the
 * seller's approval record with status='pending', seller reference with email, created_at timestamp,
 * and null values for rejection_reason and reviewedByAdmin since it hasn't been reviewed yet.
 *
 * The test ensures that newly registered sellers can access their approval history and that the
 * initial approval record is correctly created with pending status upon seller registration.
 *
 * 1. Register a new seller account via seller join endpoint (creates initial pending approval).
 * 2. Create authenticated seller connection with returned token.
 * 3. Call approvals listing endpoint with empty body (no filters).
 * 4. Validate response structure: pagination metadata present with correct types.
 * 5. Validate data array contains at least one approval record for the registered seller.
 * 6. Validate the approval record has status='pending', null rejection_reason, and null reviewedByAdmin.
 * 7. Validate seller reference contains email matching the registered seller.
 */
export async function test_api_seller_approval_list_without_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account which creates initial pending approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(authorized);
  // 2. Create authenticated seller connection for subsequent API calls
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 3. Call approvals listing endpoint with empty body (no filters)
  const response =
    await api.functional.ecommerceMall.seller.sellers.me.approvals.index(
      authenticatedSellerConnection,
      {
        body: {} satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "pagination exists",
    response.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "pagination.current is valid number",
    typeof response.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination.limit is valid number",
    typeof response.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination.records is valid number",
    typeof response.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination.pages is valid number",
    typeof response.pagination.pages === "number",
  );
  // 5. Validate data array contains at least one approval record
  TestValidator.predicate(
    "data array exists",
    response.data !== undefined && Array.isArray(response.data),
  );
  TestValidator.predicate(
    "has at least one approval record",
    response.data.length >= 1,
  );
  // 6. Find the approval record for the registered seller
  const sellerApproval = response.data.find(
    (approval) => approval.seller.id === authorized.id,
  );
  TestValidator.equals(
    "approval record exists for registered seller",
    sellerApproval !== undefined,
    true,
  );
  if (sellerApproval) {
    // Validate approval status is pending (initial status after registration)
    TestValidator.equals(
      "approval status is pending",
      sellerApproval.status,
      "pending",
    );
    // Validate rejection_reason is null (hasn't been reviewed)
    TestValidator.equals(
      "rejection_reason is null",
      sellerApproval.rejection_reason,
      null,
    );
    // Validate reviewedByAdmin is null (hasn't been reviewed yet)
    TestValidator.equals(
      "reviewedByAdmin is null",
      sellerApproval.reviewedByAdmin,
      null,
    );
    // 7. Validate seller reference contains email matching registered seller
    TestValidator.equals(
      "seller email matches registered email",
      sellerApproval.seller.email,
      authorized.email,
    );
    TestValidator.equals(
      "seller id matches registered seller id",
      sellerApproval.seller.id,
      authorized.id,
    );
    // Validate timestamps exist
    TestValidator.predicate(
      "created_at timestamp exists",
      sellerApproval.created_at !== undefined &&
        sellerApproval.created_at !== null,
    );
    TestValidator.predicate(
      "updated_at timestamp exists",
      sellerApproval.updated_at !== undefined &&
        sellerApproval.updated_at !== null,
    );
  }
  // 8. Validate results are sorted by created_at descending (newest first)
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = new Date(response.data[i].created_at).getTime();
    const next = new Date(response.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `record ${i} is not newer than record ${i + 1}`,
      current >= next,
    );
  }
}
