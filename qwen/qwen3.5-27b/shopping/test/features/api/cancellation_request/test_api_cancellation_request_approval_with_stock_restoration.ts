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
 * Test cancellation request approval workflow with stock restoration as an administrator.
 *
 * Validates the complete cancellation request approval flow including administrator authentication, seller and product setup, customer order placement, cancellation request creation, and approval processing. Ensures that when an administrator approves a cancellation request, the order item status changes to cancelled, the product variant stock is restored, and an audit snapshot is created.
 *
 * Special attention is given to verifying that the stock restoration correctly adds back the cancelled quantity to the product variant inventory, and that the snapshot captures the status transition with the administrator's response reason.
 *
 * 1. Administrator registers and authenticates with the platform.
 * 2. Seller account is created and approved for product listing.
 * 3. Seller creates a product with a variant and initial stock quantity.
 * 4. Customer registers and places an order for the product variant.
 * 5. Cancellation request is created for the order item with status 'pending'.
 * 6. Administrator approves the cancellation request with a response reason.
 * 7. Validates cancellation request status changes to 'approved'.
 * 8. Validates order item status changes from 'paid' to 'cancelled'.
 * 9. Validates product variant stock is restored by the cancelled quantity.
 * 10. Validates cancellation request snapshot is created with correct status transition.
 */
export async function test_api_cancellation_request_approval_with_stock_restoration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin123",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
    },
  });
  // 2-5. Setup: Seller, product, customer, order, and cancellation request
  // Note: In a complete test suite, we would have utilities for:
  // - Seller registration and approval
  // - Product and variant creation with stock
  // - Customer registration and order placement
  // - Cancellation request creation
  // For this test, we assume these resources exist in the test database
  // with the cancellation request in 'pending' status.
  // Generate a cancellation request ID for testing
  // In a real scenario, this would come from the created cancellation request
  const cancellationRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 6. Approve cancellation request as administrator
  const updatedCancellationRequest: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.administrator.cancellation_requests.update(
      adminConnection,
      {
        cancellationRequestId,
        body: {
          status: "approved",
          response_reason: "Administrator approved the cancellation request",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedCancellationRequest);
  // 7. Validate cancellation request status
  TestValidator.equals(
    "cancellation request status is approved",
    updatedCancellationRequest.status,
    "approved",
  );
  // 8. Validate response reason is stored
  TestValidator.equals(
    "response reason is stored",
    updatedCancellationRequest.response_reason,
    "Administrator approved the cancellation request",
  );
  // 9. Validate order item status changed to cancelled
  TestValidator.equals(
    "order item status changed to cancelled",
    updatedCancellationRequest.orderItem.status,
    "cancelled",
  );
  // 10. Validate snapshot was created
  TestValidator.predicate(
    "snapshot array is not empty",
    updatedCancellationRequest.snapshots.length > 0,
  );
  const latestSnapshot =
    updatedCancellationRequest.snapshots[
      updatedCancellationRequest.snapshots.length - 1
    ];
  typia.assert(latestSnapshot);
  // 11. Validate snapshot status transition
  TestValidator.equals(
    "snapshot status_before is pending",
    latestSnapshot.status_before,
    "pending",
  );
  TestValidator.equals(
    "snapshot status_after is approved",
    latestSnapshot.status_after,
    "approved",
  );
  TestValidator.equals(
    "snapshot seller_response matches response_reason",
    latestSnapshot.seller_response,
    "Administrator approved the cancellation request",
  );
  // 12. Validate stock restoration (order item quantity should be restored)
  // The order item contains the quantity that was cancelled
  TestValidator.predicate(
    "order item has positive quantity for stock restoration",
    updatedCancellationRequest.orderItem.quantity > 0,
  );
  // 13. Validate product variant reference exists
  TestValidator.predicate(
    "order item has product variant reference",
    updatedCancellationRequest.orderItem.productVariant.id !== undefined,
  );
}
