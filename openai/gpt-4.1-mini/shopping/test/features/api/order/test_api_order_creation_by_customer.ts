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
 * Test the complete workflow of creating a new order by an authenticated
 * customer.
 *
 * This test function performs the following steps:
 *
 * 1. Register a new customer account using the customer join API.
 * 2. Register a new seller account using the seller join API.
 * 3. Login as the seller.
 * 4. Create a new product associated with the seller.
 * 5. Create multiple SKUs for the created product.
 * 6. Login as the customer.
 * 7. Create a new order by the customer with multiple SKUs.
 * 8. Assert that the order is correctly created with expected details including
 *    status, payment status, and ordered items with correct quantities.
 *
 * This test validates key aspects of the ordering system including multi-actor
 * authentication, product and SKU creation, order submission, and order data
 * integrity.
 */
export async function test_api_order_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "Test@1234";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Register new seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "Seller@1234";
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Seller login
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://example.com/",
      referrer: "https://google.com/",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 4. Create product
  const productCode = `PRD-${RandomGenerator.alphaNumeric(6)}`;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        brand: RandomGenerator.name(1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 5. Create multiple SKUs for the product
  const skuCount = 3;
  const skus: IShoppingMallProductSku[] = [];
  const colors = ["red", "blue", "green"] as const;
  const sizes = ["S", "M", "L"] as const;
  for (let i = 0; i < skuCount; i++) {
    const sku: IShoppingMallProductSku =
      await api.functional.shoppingMall.seller.products.skus.createSku(
        connection,
        {
          productCode: productCode,
          body: {
            sku_code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
            price: Math.floor(10000 + 10000 * Math.random()),
            attributes_json: JSON.stringify({
              color: RandomGenerator.pick(colors),
              size: RandomGenerator.pick(sizes),
            }),
          } satisfies IShoppingMallProductSku.ICreate,
        },
      );
    typia.assert(sku);
    skus.push(sku);
  }

  // 6. Customer login
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://example.com/",
      referrer: "https://google.com/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 7. Create order with multiple SKUs
  const orderItems = skus.map((sku) => {
    return {
      shopping_mall_product_sku_id: sku.id,
      quantity: RandomGenerator.pick([1, 2, 3] as const),
      unit_price: sku.price,
      total_price: sku.price,
    } satisfies IShoppingMallOrderItem.ICreate;
  });
  const orderBody = {
    order_code: `ORD-${RandomGenerator.alphaNumeric(8)}`,
    shipping_address: `123 ${RandomGenerator.name(1)} St, ${RandomGenerator.name(2)}, Country`,
    shopping_mall_order_items: orderItems,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 8. Validate the created order
  TestValidator.equals(
    "order status should be 'pending'",
    order.status,
    "pending",
  );
  TestValidator.equals(
    "order payment status should be 'unpaid'",
    order.payment_status,
    "unpaid",
  );
  TestValidator.equals(
    "order items count matches",
    order.shopping_mall_order_items.length,
    orderItems.length,
  );

  for (const item of order.shopping_mall_order_items) {
    const corresponding = orderItems.find(
      (it) =>
        it.shopping_mall_product_sku_id === item.shopping_mall_product_sku_id,
    );
    TestValidator.predicate(
      "order item should exist in orderItems",
      corresponding !== undefined,
    );
    if (corresponding) {
      TestValidator.equals(
        "order item quantity should match",
        item.quantity,
        corresponding.quantity,
      );
      TestValidator.equals(
        "order item unit price should match",
        item.unit_price,
        corresponding.unit_price,
      );
      TestValidator.equals(
        "order item total price should match",
        item.total_price,
        corresponding.total_price,
      );
    }
  }
}
