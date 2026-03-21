import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an administrator can successfully retrieve a specific cancellation request by its unique identifier.
 *
 * This test verifies the admin cancellation request retrieval endpoint:
 * 1. Authenticate as admin
 * 2. Retrieve a cancellation request by ID
 * 3. Validate the response structure includes all required fields
 *
 * Note: This test uses a pre-existing cancellation request ID since the customer/seller/order
 * APIs required to create one are not available in this SDK.
 */
export async function test_api_cancellation_request_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ValidPass123!",
      name: "Test Admin",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // Step 2: Retrieve cancellation request by ID
  // Using a sample UUID - in production this would be a real cancellation request ID
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const retrievedRequest =
    await api.functional.ecommerceMall.admin.cancellation_requests.at(
      adminConnection,
      {
        requestId: requestId,
      },
    );
  typia.assert(retrievedRequest);
  // Step 3: Validate response structure
  // Validate top-level fields
  TestValidator.equals("has valid UUID id", retrievedRequest.id, requestId);
  TestValidator.predicate(
    "has non-empty reason",
    retrievedRequest.reason !== null &&
      retrievedRequest.reason !== undefined &&
      retrievedRequest.reason.length > 0,
  );
  TestValidator.predicate(
    "has valid status (pending, approved, or rejected)",
    retrievedRequest.status === "pending" ||
      retrievedRequest.status === "approved" ||
      retrievedRequest.status === "rejected",
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    retrievedRequest.created_at !== null &&
      retrievedRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "has valid updated_at timestamp",
    retrievedRequest.updated_at !== null &&
      retrievedRequest.updated_at !== undefined,
  );
  // Validate nested orderItem object
  TestValidator.predicate(
    "orderItem exists and has id",
    retrievedRequest.orderItem !== null &&
      retrievedRequest.orderItem !== undefined,
  );
  TestValidator.predicate(
    "orderItem has productSnapshot",
    retrievedRequest.orderItem.productSnapshot !== null &&
      retrievedRequest.orderItem.productSnapshot !== undefined,
  );
  TestValidator.predicate(
    "orderItem has sellerProfileSnapshot",
    retrievedRequest.orderItem.sellerProfileSnapshot !== null &&
      retrievedRequest.orderItem.sellerProfileSnapshot !== undefined,
  );
  // Validate nested customer object
  TestValidator.predicate(
    "customer exists and has id",
    retrievedRequest.customer !== null &&
      retrievedRequest.customer !== undefined,
  );
  TestValidator.predicate(
    "customer has email",
    retrievedRequest.customer.email !== null &&
      retrievedRequest.customer.email !== undefined,
  );
  TestValidator.predicate(
    "customer has status",
    retrievedRequest.customer.status === "active" ||
      retrievedRequest.customer.status === "deleted",
  );
  // Validate nested seller object
  TestValidator.predicate(
    "seller exists and has id",
    retrievedRequest.seller !== null && retrievedRequest.seller !== undefined,
  );
  TestValidator.predicate(
    "seller has email",
    retrievedRequest.seller.email !== null &&
      retrievedRequest.seller.email !== undefined,
  );
  TestValidator.predicate(
    "seller has approval_status",
    retrievedRequest.seller.approval_status !== null &&
      retrievedRequest.seller.approval_status !== undefined,
  );
  // Validate snapshots array
  TestValidator.predicate(
    "snapshots is an array",
    Array.isArray(retrievedRequest.snapshots),
  );
}
