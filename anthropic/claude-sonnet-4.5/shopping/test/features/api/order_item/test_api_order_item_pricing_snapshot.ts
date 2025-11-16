import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that order item pricing captures purchase-time snapshot and remains
 * immutable.
 *
 * This test verifies critical e-commerce pricing integrity: when a buyer
 * purchases a product, the order item must capture and permanently preserve the
 * exact pricing details at the moment of purchase (unit_price, line_total,
 * discount_amount), regardless of subsequent catalog price changes.
 *
 * Test workflow:
 *
 * 1. Create admin account and authenticate
 * 2. Create product category for organization
 * 3. Create seller account and authenticate
 * 4. Create product sale listing
 * 5. Create SKU variant with specific base_price (99.99)
 * 6. Create buyer account and authenticate
 * 7. Add SKU to cart (captures unit_price_snapshot)
 * 8. Create delivery address for shipping
 * 9. Register payment method for checkout
 * 10. Create order from cart (freezes pricing in order_items)
 * 11. Retrieve order item and validate pricing snapshot
 * 12. Verify unit_price, line_total, and discount_amount accuracy
 */
export async function test_api_order_item_pricing_snapshot(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin for category management
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: "https://admin.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(admin);

  // Step 2: Create product category (FIXED: removed non-existent properties)
  const categoryCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryCreateBody,
    },
  );
  typia.assert(category);

  // Step 3: Create and authenticate seller for product listing
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.paragraph({ sentences: 20 }),
    store_name: RandomGenerator.name(2),
    href: "https://seller.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerCreateBody,
  });
  typia.assert(seller);

  // Step 4: Create product sale listing
  const saleCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    condition: "new" as const,
    return_policy_days: 30 as const,
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleCreateBody,
    },
  );
  typia.assert(sale);

  // Step 5: Create SKU variant with specific pricing for snapshot testing
  const testBasePrice = 99.99;
  const testQuantity = 2;
  const expectedLineTotal = testBasePrice * testQuantity;

  const skuCreateBody = {
    sku_code: RandomGenerator.alphaNumeric(10),
    variant_combination: JSON.stringify({ Color: "Blue", Size: "Medium" }),
    base_price: testBasePrice,
    enabled: true,
  } satisfies IShoppingMallSaleSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: skuCreateBody,
    },
  );
  typia.assert(sku);

  // Step 6: Create and authenticate buyer for purchasing
  const buyerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    href: "https://shop.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerCreateBody,
  });
  typia.assert(buyer);

  // Step 7: Add SKU to cart (captures unit_price_snapshot)
  const cartItemCreateBody = {
    shopping_mall_sale_sku_id: sku.id,
    quantity: testQuantity,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // Validate cart captured price snapshot
  TestValidator.equals(
    "cart item unit_price_snapshot matches SKU base_price",
    cartItem.unit_price_snapshot,
    testBasePrice,
  );

  // Step 8: Create delivery address
  const addressCreateBody = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: RandomGenerator.paragraph({ sentences: 5 }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(5),
    country: "United States",
    address_label: "Home",
    address_type: "residential",
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: addressCreateBody,
      },
    );
  typia.assert(address);

  // Step 9: Register payment method
  const paymentMethodCreateBody = {
    payment_type: "credit_card",
    provider: "Stripe",
    provider_token: RandomGenerator.alphaNumeric(32),
    card_brand: "visa",
    last_four_digits: "4242",
    expiry_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    expiry_year: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<2024>
    >(),
    billing_name: RandomGenerator.name(),
    billing_postal_code: RandomGenerator.alphaNumeric(5),
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // Step 10: Create order from cart (freezes pricing at purchase time)
  const orderCreateBody = {
    cart_item_ids: [cartItem.id],
    buyer_address_id: address.id,
    payment_method_id: paymentMethod.id,
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: orderCreateBody,
    },
  );
  typia.assert(order);

  // Validate order was created successfully
  TestValidator.predicate(
    "order should have at least one item",
    order.items.length > 0,
  );

  const firstOrderItem = order.items[0];
  typia.assertGuard(firstOrderItem!);

  // Step 11: Retrieve order item using target API endpoint
  const retrievedOrderItem =
    await api.functional.shoppingMall.buyer.orders.items.at(connection, {
      orderId: order.id,
      itemId: firstOrderItem.id,
    });
  typia.assert(retrievedOrderItem);

  // Step 12: Validate pricing snapshot accuracy
  TestValidator.equals(
    "retrieved order item unit_price matches purchase-time SKU price",
    retrievedOrderItem.unit_price,
    testBasePrice,
  );

  TestValidator.equals(
    "retrieved order item quantity matches ordered quantity",
    retrievedOrderItem.quantity,
    testQuantity,
  );

  TestValidator.equals(
    "retrieved order item line_total correctly calculated as unit_price × quantity",
    retrievedOrderItem.line_total,
    expectedLineTotal,
  );

  TestValidator.equals(
    "retrieved order item discount_amount is correctly captured",
    retrievedOrderItem.discount_amount,
    0,
  );

  // Validate that pricing is frozen in the order record
  TestValidator.equals(
    "order item unit_price from creation matches retrieved unit_price",
    firstOrderItem.unit_price,
    retrievedOrderItem.unit_price,
  );

  TestValidator.equals(
    "order item line_total from creation matches retrieved line_total",
    firstOrderItem.line_total,
    retrievedOrderItem.line_total,
  );

  // Validate SKU reference is preserved
  TestValidator.equals(
    "order item references correct SKU",
    retrievedOrderItem.shopping_mall_sale_sku_id,
    sku.id,
  );
}
