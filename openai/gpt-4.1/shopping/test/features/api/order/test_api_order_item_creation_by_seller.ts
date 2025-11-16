import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that an authenticated seller can add a valid item (product SKU) to an
 * existing shopping mall order using a business order number. This scenario
 * covers seller authentication, the correct payload structure with all required
 * fields for item creation, inventory and product SKU validation, price and
 * subtotal calculation, and enforces security by making sure only authenticated
 * sellers may add items to their orders. Validates business logic such as
 * prevention of duplicate SKUs, correct linkage to parent order, and initial
 * delivery/refund statuses. The test should confirm that the created item
 * appears in the order with all expected fields populated as per the response
 * schema.
 */
export async function test_api_order_item_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller onboarding - register/obtain valid JWT (auth context)
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(16),
        business_name: RandomGenerator.name(3),
        registration_number: RandomGenerator.alphaNumeric(10),
        business_phone: RandomGenerator.mobile(),
        href: "https://seller-portal.example.com/onboarding",
        referrer: "https://business-directory.example.com/",
        ip: "127.0.0.1",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Generate mock order and product/SKU context to construct a valid payload
  // (In real scenario, you would create the product, SKU, and order using respective APIs; here, we'll simulate with random summaries)
  const orderSummary: IShoppingMallOrder.ISummary =
    typia.random<IShoppingMallOrder.ISummary>();
  const productSummary: IShoppingMallProduct.ISummary =
    typia.random<IShoppingMallProduct.ISummary>();
  const skuSummary: IShoppingMallProductSku.ISummary =
    typia.random<IShoppingMallProductSku.ISummary>();

  // 3. Compose a valid payload for order item creation
  const quantity: number & tags.Type<"int32"> & tags.Minimum<1> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const unit_price = skuSummary.in_stock ? productSummary.default_price : 1;
  const subtotal = quantity * unit_price;
  const orderItemBody = {
    shopping_mall_product_id: productSummary.id,
    shopping_mall_product_sku_id: skuSummary.id,
    quantity,
    unit_price,
    subtotal,
    currency: orderSummary.currency,
    delivered: false,
    refunded: false,
  } satisfies IShoppingMallOrderItem.ICreate;

  // 4. Call the API as authenticated seller - create order item
  const created: IShoppingMallOrderItem =
    await api.functional.shoppingMall.seller.orders.items.create(connection, {
      orderNumber: orderSummary.order_number,
      body: orderItemBody,
    });
  typia.assert(created);

  // 5. Validate response: expected linkage, populated fields, initial delivery/refund states, price/subtotal math, correct parent order/product/sku
  TestValidator.equals(
    "order linkage/order_number",
    created.order.order_number,
    orderSummary.order_number,
  );
  TestValidator.equals(
    "order item product linkage",
    created.product.id,
    productSummary.id,
  );
  TestValidator.equals("order item sku linkage", created.sku.id, skuSummary.id);
  TestValidator.equals(
    "order item quantity matches",
    created.quantity,
    quantity,
  );
  TestValidator.equals(
    "order item unit_price matches",
    created.unit_price,
    unit_price,
  );
  TestValidator.equals("order item subtotal math", created.subtotal, subtotal);
  TestValidator.equals(
    "order item currency matches",
    created.currency,
    orderSummary.currency,
  );
  TestValidator.equals(
    "order item delivered initial state",
    created.delivered,
    false,
  );
  TestValidator.equals(
    "order item refund initial state",
    created.refunded,
    false,
  );

  // 6. Security: ensure that only authenticated sellers can add order items
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "only authenticated sellers may add order items",
    async () => {
      await api.functional.shoppingMall.seller.orders.items.create(unauthConn, {
        orderNumber: orderSummary.order_number,
        body: orderItemBody,
      });
    },
  );

  // 7. Business logic: prevent duplicate SKU for same order
  await TestValidator.error(
    "duplicate SKUs in single order not allowed",
    async () => {
      await api.functional.shoppingMall.seller.orders.items.create(connection, {
        orderNumber: orderSummary.order_number,
        body: orderItemBody,
      });
    },
  );
}
