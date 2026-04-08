import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_customer_orders_items_cancellation_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_cancellation_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test the primary success path where a seller rejects a customer's cancellation request for their order item.
 *
 * Validates the complete cancellation request rejection flow including seller authentication, customer order creation, cancellation request submission, and seller rejection with reason. Ensures that the cancellation request status correctly transitions from 'pending' to 'rejected', the response reason is properly stored, and a snapshot is created for audit trail purposes.
 *
 * Special attention is given to verifying that the order item status remains 'paid' after rejection (not cancelled), the snapshot captures the correct status transition with seller response, and the updated cancellation request is returned to the seller with all relevant information.
 *
 * 1. Seller registers and authenticates to the shopping mall platform.
 * 2. Customer registers and authenticates to the shopping mall platform.
 * 3. Seller creates a product with name, description, and base price.
 * 4. Customer adds the product variant to cart and completes checkout to create an order.
 * 5. Customer creates a cancellation request for the order item with a reason.
 * 6. Seller rejects the cancellation request with a response reason.
 * 7. Validates cancellation request status is 'rejected'.
 * 8. Validates response reason is stored correctly.
 * 9. Validates snapshot created with status_before='pending', status_after='rejected', and seller_response.
 * 10. Validates order item status remains 'paid'.
 */
export async function test_api_cancellation_request_rejection_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Customer adds product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: product.variants[0].id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 5. Customer completes checkout to create order
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  const orderId = order.id;
  const itemId = order.items[0].id;
  // 6. Customer creates cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_orders_items_cancellation_create(
      customerConnection,
      {
        params: {
          orderId,
          itemId,
        },
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "initial status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 7. Seller rejects the cancellation request
  const rejectedCancellation =
    await api.functional.shoppingMall.seller.orders.items.cancellation.reject(
      sellerConnection,
      {
        orderId,
        itemId,
        body: {
          response_reason:
            "The item has already been prepared for shipment and cannot be cancelled.",
        },
      },
    );
  typia.assert(rejectedCancellation);
  // 8. Validate cancellation request status is 'rejected'
  TestValidator.equals(
    "status is rejected",
    rejectedCancellation.status,
    "rejected",
  );
  // 9. Validate response reason is stored correctly
  TestValidator.equals(
    "response reason matches",
    rejectedCancellation.response_reason,
    "The item has already been prepared for shipment and cannot be cancelled.",
  );
  // 10. Validate snapshot created with correct status transition
  TestValidator.predicate(
    "has at least one snapshot",
    rejectedCancellation.snapshots.length >= 1,
  );
  const snapshot = rejectedCancellation.snapshots[0];
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot status_before is pending",
    snapshot.status_before,
    "pending",
  );
  TestValidator.equals(
    "snapshot status_after is rejected",
    snapshot.status_after,
    "rejected",
  );
  TestValidator.equals(
    "snapshot seller_response matches",
    snapshot.seller_response,
    "The item has already been prepared for shipment and cannot be cancelled.",
  );
  // 11. Validate order item status remains 'paid'
  TestValidator.equals(
    "order item status remains paid",
    rejectedCancellation.orderItem.status,
    "paid",
  );
}
