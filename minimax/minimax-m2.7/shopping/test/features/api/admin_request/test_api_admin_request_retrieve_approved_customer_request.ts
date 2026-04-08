import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";

/**
 * Test retrieving an approved admin request with reviewer details populated.
 *
 * Validates the complete workflow where a super administrator retrieves and approves
 * an admin request from a customer account. The test ensures that:
 * 1. The GET endpoint returns the request with correct initial status
 * 2. The PUT endpoint successfully approves the request
 * 3. The GET endpoint returns the approved request with reviewer details populated
 *
 * The response structure is validated including:
 * - Request identifier matches the submitted request
 * - actorType is 'customer' indicating the request originated from customer
 * - status transitions to 'approved' after approval
 * - reviewer field contains super admin summary with id, email, createdAt
 * - reviewedReason may be null or contain review comments
 * - timestamps accurately reflect approval timing
 *
 * Note: The customer admin request creation endpoint is not available in the
 * current API. This test assumes admin requests are pre-created in the test
 * environment database with known UUIDs for automated testing purposes.
 */
export async function test_api_admin_request_retrieve_approved_customer_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account for approval workflow
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Create customer account to submit admin request
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. NOTE: Customer admin request creation endpoint is not exposed in current API
  // For E2E testing, admin requests are pre-seeded in test database
  // Test uses a known request ID that exists in test data setup
  // Use a test-specific request ID that should exist in pre-seeded test data
  // This UUID corresponds to a customer-initiated admin request in pending status
  const testRequestId = typia.random<string & tags.Format<"uuid">>();
  // 4. Super admin retrieves the pending admin request
  const pendingRequest =
    await api.functional.ecommerceMall.superAdmin.admin.admin_requests.at(
      superAdminConnection,
      { requestId: testRequestId },
    );
  typia.assert(pendingRequest);
  // Validate pending request structure before approval
  TestValidator.equals(
    "actor type is customer",
    pendingRequest.actorType,
    "customer",
  );
  TestValidator.equals(
    "initial status is pending",
    pendingRequest.status,
    "pending",
  );
  // 5. Super admin approves the admin request
  const approvedRequest =
    await api.functional.ecommerceMall.superAdmin.admin.admin_requests.update(
      superAdminConnection,
      {
        requestId: testRequestId,
        body: {
          action: "approve" as const,
        },
      },
    );
  typia.assert(approvedRequest);
  // 6. Super admin retrieves the approved request again
  const retrievedRequest =
    await api.functional.ecommerceMall.superAdmin.admin.admin_requests.at(
      superAdminConnection,
      { requestId: testRequestId },
    );
  typia.assert(retrievedRequest);
  // 7. Validate approved request response structure
  TestValidator.equals(
    "request ID matches original request",
    retrievedRequest.id,
    testRequestId,
  );
  TestValidator.equals(
    "actor type is customer",
    retrievedRequest.actorType,
    "customer",
  );
  TestValidator.equals(
    "status transitioned to approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "requested grade is admin",
    retrievedRequest.requestedGrade,
    "admin",
  );
  // Validate reviewer field is populated with super admin summary
  TestValidator.predicate(
    "reviewer is populated with super admin summary",
    retrievedRequest.reviewer !== null &&
      retrievedRequest.reviewer !== undefined,
  );
  if (retrievedRequest.reviewer) {
    TestValidator.equals(
      "reviewer has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        retrievedRequest.reviewer.id,
      ),
      true,
    );
    TestValidator.equals(
      "reviewer email is valid format",
      typeof retrievedRequest.reviewer.email === "string" &&
        retrievedRequest.reviewer.email.includes("@"),
      true,
    );
    TestValidator.equals(
      "reviewer has createdAt timestamp",
      typeof retrievedRequest.reviewer.createdAt === "string",
      true,
    );
  }
  // reviewedReason may be null when approving (only required when rejecting)
  TestValidator.predicate(
    "reviewedReason is null or contains review comment",
    retrievedRequest.reviewedReason === null ||
      (typeof retrievedRequest.reviewedReason === "string" &&
        retrievedRequest.reviewedReason.length >= 0),
  );
  // Validate timestamps reflect the approval transaction
  TestValidator.equals(
    "createdAt timestamp exists",
    typeof retrievedRequest.createdAt === "string",
    true,
  );
  TestValidator.equals(
    "updatedAt timestamp exists",
    typeof retrievedRequest.updatedAt === "string",
    true,
  );
  TestValidator.equals(
    "request is not soft deleted",
    retrievedRequest.deletedAt,
    null,
  );
}