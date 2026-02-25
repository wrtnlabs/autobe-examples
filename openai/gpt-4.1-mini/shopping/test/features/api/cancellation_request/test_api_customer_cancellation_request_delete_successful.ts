import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";
import { TestValidator } from "@nestia/e2e";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";

export async function test_api_customer_cancellation_request_delete_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, { body: {} });
  typia.assert(customer);
  // 2. Seller joins and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(seller);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller creates a product variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Customer creates an order containing the variant
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        orderItems: [
          {
            quantity: 1,
            shoppingMallProductVariantId: variant.id,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 6. Customer creates an order item under the order
  // Note: The order might have already created order items, but to ensure, create explicitly
  const orderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: {
          shoppingMallOrderId: order.id,
          shoppingMallProductVariantId: variant.id,
          quantity: 1,
          status: "paid",
        },
      },
    );
  typia.assert(orderItem);
  // 7. Customer creates a cancellation request for the order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          shoppingMallCustomerId: customer.id,
          shoppingMallOrderItemId: orderItem.id,
          reason: "Test cancellation",
        },
      },
    );
  typia.assert(cancellationRequest);
  // 8. Customer deletes the cancellation request
  await api.functional.shoppingMall.customer.cancellation_requests.erase(
    customerConnection,
    {
      cancellationRequestId: cancellationRequest.id,
    },
  );
  // 9. Verify deletion by asserting error on fetching the same cancellation request
  await TestValidator.error(
    "cancellation request should be deleted",
    async () => {
      await api.functional.shoppingMall.customer.cancellation_requests.erase(
        customerConnection,
        {
          cancellationRequestId: cancellationRequest.id,
        },
      );
    },
  );
}
