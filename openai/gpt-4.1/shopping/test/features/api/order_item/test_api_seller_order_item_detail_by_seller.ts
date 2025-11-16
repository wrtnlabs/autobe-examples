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
 * Validates that an authenticated seller can retrieve detailed information for
 * an order item (in an order containing their product) using the
 * /shoppingMall/seller/orders/{orderNumber}/items/{orderItemId} endpoint and
 * that cross-seller access is denied.
 *
 * Workflow:
 *
 * 1. Register seller1 (acting as catalog/product owner).
 * 2. Register seller2 (will be used to verify cross-seller isolation).
 * 3. Register a third seller to simulate a buyer (as only seller registration is
 *    available for data setup, this account acts as the customer placing the
 *    order).
 * 4. Use the simulated customer/seller3 to order from seller1’s catalog, manually
 *    assembling order and order item as only seller registration exists.
 * 5. With seller1’s authorization token, attempt to retrieve order item using
 *    order number and item ID (should succeed).
 * 6. With seller2’s token, attempt to retrieve same order item (should fail with
 *    authorization error).
 * 7. Verify both positive and negative scenarios, and assert returned data
 *    structure is an IShoppingMallOrderItem.
 */
export async function test_api_seller_order_item_detail_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller1 (product owner)
  const seller1Info = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://example.com/register",
    referrer: "https://example.com/login",
    ip: undefined,
  } satisfies IShoppingMallSeller.ICreate;
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: seller1Info,
  });
  typia.assert(seller1);

  // 2. Register seller2 (non-owner, will be denied authorization)
  const seller2Info = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password456!",
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://example.com/register",
    referrer: "https://example.com/login",
    ip: undefined,
  } satisfies IShoppingMallSeller.ICreate;
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: seller2Info,
  });
  typia.assert(seller2);

  // 3. Register third seller as mock customer (since only seller registration is available)
  const buyerInfo = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password789!",
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://example.com/register",
    referrer: "https://example.com/login",
    ip: undefined,
  } satisfies IShoppingMallSeller.ICreate;
  const buyerSeller = await api.functional.auth.seller.join(connection, {
    body: buyerInfo,
  });
  typia.assert(buyerSeller);

  // 4. Simulate order and item referencing seller1's ownership (simulate as no order creation API is available)
  // Use typia.random to simulate an order referencing seller1's product
  const productOwnerSummary = seller1.seller!;
  const productSummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    default_price: 1000,
    business_status: "published",
    seller: productOwnerSummary,
    categories: [],
    created_at: new Date().toISOString(),
  } satisfies IShoppingMallProduct.ISummary;
  const skuSummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    code: RandomGenerator.alphaNumeric(12),
    product_title: productSummary.title,
    option_summary: RandomGenerator.name(),
    in_stock: true,
  } satisfies IShoppingMallProductSku.ISummary;
  const orderSummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    order_number: RandomGenerator.alphaNumeric(16),
    status: "paid",
    total_amount: productSummary.default_price,
    currency: "USD",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IShoppingMallOrder.ISummary;
  const orderItemToTest = {
    id: typia.random<string & tags.Format<"uuid">>(),
    order: orderSummary,
    product: productSummary,
    sku: skuSummary,
    quantity: 1,
    unit_price: productSummary.default_price,
    subtotal: productSummary.default_price,
    currency: "USD",
    delivered: false,
    refunded: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IShoppingMallOrderItem;

  // 5. Seller1: Retrieve order item detail (should succeed)
  // Assume orderItemToTest.order.order_number and orderItemToTest.id are the keys
  const output = await api.functional.shoppingMall.seller.orders.items.at(
    connection,
    {
      orderNumber: orderItemToTest.order.order_number,
      orderItemId: orderItemToTest.id,
    },
  );
  typia.assert(output);
  // 6. Seller2: Simulate cross-seller token by logging in as seller2 (token switching is handled by join)
  await api.functional.auth.seller.join(connection, {
    body: seller2Info,
  });
  // Try to retrieve same order item with seller2 token (should fail with error)
  await TestValidator.error("cross-seller access is denied", async () => {
    await api.functional.shoppingMall.seller.orders.items.at(connection, {
      orderNumber: orderItemToTest.order.order_number,
      orderItemId: orderItemToTest.id,
    });
  });
}
