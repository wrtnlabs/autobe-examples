import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test status preservation for a rejected seller cancellation request.
 * 1. Seller creates product
 * 2. Customer joins and purchases product via cart checkout
 * 3. Customer requests cancellation of order item
 * 4. Seller rejects cancellation request
 * 5. Verify cancellation request status is 'rejected'
 * 6. Verify order item status remains 'paid' after rejection
 */
export async function test_api_seller_cancellation_request_rejection_preserves_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // 2. Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);
  // 3. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        is_available: true,
      },
    },
  );
  typia.assert(product);
  // 4. Customer purchases the product by creating an order
  // Since there's no direct API to create an order from cart, we'll use the
  // order creation endpoint which typically requires authentication and
  // creates an order from the customer's cart items
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // Verify order has exactly one item
  TestValidator.equals(
    "order has exactly one item",
    order.order_items.length,
    1,
  );
  const orderItem = order.order_items[0];
  // Verify initial status is 'paid'
  TestValidator.equals(
    "initial item status is paid",
    orderItem.item_status,
    "paid",
  );
  // 5. Customer requests cancellation of the order item
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "pending" as const,
          order_item_id: orderItem.id,
          seller_id: orderItem.seller.id,
          customer_id: customer.customer.id,
        },
      },
    );
  typia.assert(cancellationRequest);
  // Verify cancellation request was created with pending status
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 6. Seller rejects the cancellation request with a reason
  await api.functional.ecommerceMall.seller.orders.items.cancel.reject(
    sellerConnection,
    {
      orderId: order.id,
      orderItemId: orderItem.id,
      body: {
        reason: "Product is already shipped and cannot be cancelled",
      },
    },
  );
  // 7. Retrieve the cancellation request to verify status is now 'rejected'
  const updatedRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.at(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(updatedRequest);
  // Verify rejection status and that response timestamp is set
  TestValidator.equals(
    "cancellation request status is rejected",
    updatedRequest.status,
    "rejected",
  );
  TestValidator.notEquals(
    "responded_at is set after rejection",
    updatedRequest.responded_at,
    null,
  );
  // 8. Verify order item status is preserved as 'paid'
  // The order item status should still be 'paid' after rejection
  // Since we don't have a direct endpoint to get the updated order item,
  // we'll use the cancellation request which should have the latest order item status
  typia.assert(updatedRequest.orderItem);
  TestValidator.equals(
    "order item status preserved as paid",
    updatedRequest.orderItem.item_status,
    "paid",
  );
}
