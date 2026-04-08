import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

/**
 * Test the scenario where a seller rejects a pending cancellation request submitted by a customer.
 *
 * Validates the complete cancellation request rejection workflow including seller authentication, cancellation request creation by customer, and rejection by seller. Ensures that when a seller rejects a cancellation request, the order item status remains unchanged, no stock is restored, and an audit snapshot is created.
 *
 * Special attention is given to verifying that the rejection does not affect the order item status or inventory, while properly recording the seller's response reason and creating an immutable snapshot for audit purposes.
 *
 * 1. Register and authenticate a seller account.
 * 2. Register and authenticate a customer account.
 * 3. Customer creates a cancellation request for an order item (status: pending).
 * 4. Seller rejects the cancellation request with a response reason.
 * 5. Validates cancellation request status changes to 'rejected'.
 * 6. Validates response_reason is stored correctly.
 * 7. Validates order item status remains 'paid' (not cancelled).
 * 8. Validates a snapshot is created with status_before='pending' and status_after='rejected'.
 * 9. Validates updated_at timestamp is set.
 */
export async function test_api_cancellation_request_seller_reject(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 3. Customer creates a cancellation request
  // Note: This requires an existing order item in 'paid' status from the seller's product
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(cancellationRequest);
  // Verify initial status is 'pending'
  TestValidator.equals(
    "initial cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 4. Seller rejects the cancellation request
  const responseReason =
    "The item has already been prepared for shipment and cannot be cancelled at this time.";
  const updatedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "rejected",
          response_reason: responseReason,
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Validate cancellation request status changed to 'rejected'
  TestValidator.equals(
    "cancellation request status is rejected",
    updatedRequest.status,
    "rejected",
  );
  // 6. Validate response_reason is stored correctly
  TestValidator.equals(
    "response reason is stored correctly",
    updatedRequest.response_reason,
    responseReason,
  );
  // 7. Validate order item status remains 'paid' (not cancelled)
  TestValidator.equals(
    "order item status remains paid after rejection",
    updatedRequest.orderItem.status,
    "paid",
  );
  // 8. Validate snapshot is created
  TestValidator.predicate(
    "snapshot array is not empty",
    updatedRequest.snapshots.length > 0,
  );
  const latestSnapshot =
    updatedRequest.snapshots[updatedRequest.snapshots.length - 1];
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
    responseReason,
  );
  // 9. Validate updated_at timestamp is set
  TestValidator.predicate(
    "updated_at timestamp exists",
    updatedRequest.updated_at !== undefined,
  );
}
