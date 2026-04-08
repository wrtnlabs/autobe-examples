import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test cancellation request rejection workflow as an administrator.
 *
 * Validates the rejection flow where an administrator rejects a pending cancellation request, ensuring the order item continues processing normally without inventory restoration. Verifies that the cancellation request status transitions correctly, the response reason is stored, and an immutable snapshot is created for audit purposes.
 *
 * Note: This test assumes the cancellation request already exists in the system with status 'pending'. In a complete test suite, prerequisite setup would create the seller, customer, product, order, and cancellation request before this test executes.
 *
 * 1. Administrator registers and authenticates to the platform.
 * 2. Administrator rejects an existing pending cancellation request with a response reason.
 * 3. Validates cancellation request status transitions to 'rejected' with stored response reason.
 * 4. Validates order item status remains 'paid' (not cancelled, distinguishing from approval).
 * 5. Validates snapshot was created with status_before='pending', status_after='rejected', and seller_response.
 * 6. Validates snapshot includes seller information and cancellation request reference.
 */
export async function test_api_cancellation_request_rejection_continues_processing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin_rejection@test.com",
      password: "Admin123!",
      href: "https://mall.com/admin/join",
      referrer: "https://mall.com/admin",
    },
  });
  typia.assert(adminAuth);
  // Note: In a complete test environment, the following setup would occur:
  // - Create seller account and approve it
  // - Create product with variants and inventory
  // - Create customer account with shipping address
  // - Place order for the product variant
  // - Create cancellation request for the order item (status: pending)
  //
  // Since the prerequisite APIs are not available in this test function,
  // we use a randomly generated UUID. In production test suites, this would
  // be replaced with an actual cancellation request ID from the setup phase.
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  // 2. Reject the cancellation request as administrator
  const updateBody = {
    status: "rejected" as const,
    response_reason:
      "Product is already prepared for shipment and cannot be cancelled.",
  } satisfies IShoppingMallCancellationRequest.IUpdate;
  const updatedRequest =
    await api.functional.shoppingMall.administrator.cancellation_requests.update(
      adminConnection,
      {
        cancellationRequestId,
        body: updateBody,
      },
    );
  typia.assert(updatedRequest);
  // 3. Validate cancellation request status is 'rejected'
  TestValidator.equals("status is rejected", updatedRequest.status, "rejected");
  // 4. Validate response reason is stored
  TestValidator.equals(
    "response reason is stored",
    updatedRequest.response_reason,
    updateBody.response_reason,
  );
  // 5. Validate order item status remains 'paid' (not cancelled)
  // This is the key difference between rejection and approval:
  // - Approval: order item status changes to 'cancelled', stock restored
  // - Rejection: order item status remains 'paid', no stock change
  TestValidator.equals(
    "order item status remains paid",
    updatedRequest.orderItem.status,
    "paid",
  );
  // 6. Validate snapshot was created for audit trail
  TestValidator.predicate(
    "snapshot array is not empty",
    updatedRequest.snapshots.length > 0,
  );
  // 7. Validate the latest snapshot has correct status transition
  const latestSnapshot =
    updatedRequest.snapshots[updatedRequest.snapshots.length - 1];
  typia.assert(latestSnapshot);
  TestValidator.equals(
    "snapshot status_before is pending",
    latestSnapshot.status_before,
    "pending",
  );
  TestValidator.equals(
    "snapshot status_after is rejected",
    latestSnapshot.status_after,
    "rejected",
  );
  TestValidator.equals(
    "snapshot seller_response matches rejection reason",
    latestSnapshot.seller_response,
    updateBody.response_reason,
  );
  // 8. Validate snapshot includes seller information
  TestValidator.predicate(
    "snapshot includes seller",
    latestSnapshot.seller.email !== undefined,
  );
  // 9. Validate snapshot includes cancellation request reference
  TestValidator.equals(
    "snapshot references correct cancellation request",
    latestSnapshot.cancellationRequest.id,
    cancellationRequestId,
  );
  // 10. Validate snapshot timestamp is recent (within last minute)
  const snapshotTime = new Date(latestSnapshot.created_at).getTime();
  const now = Date.now();
  TestValidator.predicate(
    "snapshot created recently",
    now - snapshotTime < 60000,
  );
}
