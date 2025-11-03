import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReturnShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";

/**
 * Test updating a customer order by orderCode with proper authentication and
 * authorization.
 *
 * This test covers
 *
 * 1. Customer registration and login
 * 2. Seller registration and login
 * 3. Seller creates a product
 * 4. Customer creates an order with one SKU from the product
 * 5. Customer updates the order (payment_status and shipping_address)
 * 6. Unauthorized seller cannot update the customer order
 *
 * Validations at each step ensure type safety, correct business logic, and
 * authorization enforcement.
 */
export async function test_api_order_update_by_customer_valid_workflow(
  connection: api.IConnection,
) {
  // 1. Customer joins and is authorized
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "customer_prompt_password123",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerCreateBody,
  });
  typia.assert(customer);

  // 2. Seller joins and is authorized
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "seller_prompt_password123",
    store_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerCreateBody,
  });
  typia.assert(seller);

  // 3. Seller logs in (simulate actor switching)
  const sellerLoginBody = {
    email: sellerCreateBody.email,
    password: sellerCreateBody.password,
    ip: null,
    href: "http://localhost",
    referrer: "http://localhost",
  } satisfies IShoppingMallSeller.ILogin;
  await api.functional.auth.seller.login(connection, { body: sellerLoginBody });

  // 4. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    brand: RandomGenerator.name(1),
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productCreateBody },
  );
  typia.assert(product);

  // Use first SKU for order items (reject if none)
  if (
    !product.shopping_mall_product_skus ||
    product.shopping_mall_product_skus.length === 0
  ) {
    throw new Error("No SKU found for created product");
  }
  const sku = product.shopping_mall_product_skus[0];

  // 5. Customer logs in
  const customerLoginBody = {
    email: customerCreateBody.email,
    password: customerCreateBody.password,
    ip: null,
    href: "http://localhost",
    referrer: "http://localhost",
  } satisfies IShoppingMallCustomer.ILogin;
  await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });

  // 6. Customer creates an order
  const orderItemBody = {
    shopping_mall_product_sku_id: sku.id,
    quantity: 1,
    unit_price: sku.price,
    total_price: sku.price,
  } satisfies IShoppingMallOrderItem.ICreate;
  const orderCreateBody = {
    order_code: RandomGenerator.alphaNumeric(12),
    shipping_address: RandomGenerator.paragraph({ sentences: 6 }),
    shopping_mall_order_items: [orderItemBody],
    shopping_mall_payments: [],
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderCreateBody },
  );
  typia.assert(order);

  // 7. Customer updates the order
  const updateBody = {
    payment_status: "paid",
    shipping_address: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IShoppingMallOrder.IUpdate;
  const updatedOrder = await api.functional.shoppingMall.customer.orders.update(
    connection,
    {
      orderCode: order.order_code,
      body: updateBody,
    },
  );
  typia.assert(updatedOrder);

  TestValidator.equals(
    "orderCode matches",
    updatedOrder.order_code,
    order.order_code,
  );
  TestValidator.equals(
    "payment_status updated",
    updatedOrder.payment_status,
    "paid",
  );
  TestValidator.equals(
    "shipping_address updated",
    updatedOrder.shipping_address,
    updateBody.shipping_address,
  );

  // 8. Negative test: seller (unauthorized) tries to update customer's order
  await api.functional.auth.seller.login(connection, { body: sellerLoginBody });
  await TestValidator.error(
    "seller cannot update customer's order",
    async () => {
      await api.functional.shoppingMall.customer.orders.update(connection, {
        orderCode: order.order_code,
        body: {
          payment_status: "refunded",
        } satisfies IShoppingMallOrder.IUpdate,
      });
    },
  );

  // 9. Switch back to customer
  await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });

  // Step 10 is omitted as no separate fetch endpoint is provided
}
