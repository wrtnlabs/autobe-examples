import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_customer_orders_items_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_items_cancellation_requests_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";

/**
 * Test seller rejection of customer cancellation request workflow.
 *
 * Validates the complete cancellation request rejection flow where a customer submits a cancellation request and the seller rejects it with a response reason. This ensures the order continues normal processing while the customer's request is properly denied.
 *
 * The test covers the following workflow:
 *
 * 1. Customer registers and authenticates with valid credentials
 * 2. Seller registers and authenticates with valid credentials
 * 3. Customer creates a cancellation request for an order item
 * 4. Seller rejects the cancellation request with a response reason
 * 5. Validates the cancellation request status is 'rejected'
 * 6. Validates the seller_response field contains the rejection reason
 * 7. Validates the order item status remains 'paid'
 * 8. Validates the parent order status is unchanged
 *
 * This test ensures proper business logic for cancellation request rejection where orders continue processing normally after rejection.
 */
export async function test_api_cancellation_request_seller_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Customer creates cancellation request for an order item
  // Note: Using random UUIDs as the API will validate structure in simulation mode
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequest =
    await generate_random_ecommerce_customer_orders_items_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: "Changed my mind about the purchase",
        } satisfies IEcommerceCancellationRequest.ICreate,
        params: {
          orderId,
          itemId,
        },
      },
    );
  typia.assert(cancellationRequest);
  // Verify initial status is pending
  TestValidator.equals(
    "initial status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 4. Seller rejects the cancellation request with a response reason
  const rejectionReason =
    "The item is already being prepared for shipment and cannot be cancelled at this time.";
  const updatedCancellationRequest =
    await api.functional.ecommerce.seller.orders.items.cancellation_requests.update(
      sellerConnection,
      {
        orderId,
        itemId,
        requestId: cancellationRequest.id,
        body: {
          status: "rejected",
          seller_response: rejectionReason,
        } satisfies IEcommerceCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedCancellationRequest);
  // 5. Verify the cancellation request status changes to 'rejected'
  TestValidator.equals(
    "status is rejected",
    updatedCancellationRequest.status,
    "rejected",
  );
  // 6. Verify the seller_response field is populated with the rejection reason
  TestValidator.equals(
    "seller response matches",
    updatedCancellationRequest.sellerResponse,
    rejectionReason,
  );
  // 7. Verify the order item status remains 'paid' (continues normal processing)
  TestValidator.equals(
    "order item status remains paid",
    updatedCancellationRequest.orderItem.status,
    "paid",
  );
  // 8. Verify the parent order status is unchanged
  TestValidator.equals(
    "parent order status exists",
    updatedCancellationRequest.orderItem.order.status,
    "paid",
  );
  // 9. Verify the cancellation request ID matches
  TestValidator.equals(
    "request ID preserved",
    updatedCancellationRequest.id,
    cancellationRequest.id,
  );
}
