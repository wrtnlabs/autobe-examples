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
 * Test creating an order with multiple different products in the cart,
 * validating item quantity handling and line total calculations.
 *
 * This test ensures that orders correctly capture multiple products with
 * different quantities and prices. It validates that all cart items are
 * converted to order items with correct product snapshot information
 * (product_name, sku_code), accurate pricing (unit_price, line_total), and
 * proper variant attribute preservation.
 *
 * Test workflow:
 *
 * 1. Create admin and authenticate
 * 2. Create product category
 * 3. Create seller and authenticate
 * 4. Create first product with SKU variant
 * 5. Create second product with SKU variant
 * 6. Create buyer and authenticate
 * 7. Create shipping address
 * 8. Register payment method
 * 9. Add first product to cart with quantity 2
 * 10. Add second product to cart with quantity 3
 * 11. Create order from cart items
 * 12. Validate order structure and calculations
 */
export async function test_api_order_creation_with_multiple_items(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create and authenticate seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create first product with SKU
  const product1Code = RandomGenerator.alphaNumeric(10);
  const product1 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: product1Code,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new" as const,
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(product1);

  const sku1Code = `${product1Code}-SKU1`;
  const sku1VariantCombination = JSON.stringify({
    Color: "Red",
    Size: "Large",
  });
  const sku1BasePrice = typia.random<
    number & tags.Minimum<1> & tags.Maximum<1000>
  >() satisfies number as number;
  const sku1 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: product1Code,
      body: {
        sku_code: sku1Code,
        variant_combination: sku1VariantCombination,
        base_price: sku1BasePrice,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku1);

  // Step 5: Create second product with SKU
  const product2Code = RandomGenerator.alphaNumeric(10);
  const product2 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: product2Code,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new" as const,
        return_policy_days: 14,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(product2);

  const sku2Code = `${product2Code}-SKU2`;
  const sku2VariantCombination = JSON.stringify({
    Color: "Blue",
    Size: "Medium",
  });
  const sku2BasePrice = typia.random<
    number & tags.Minimum<1> & tags.Maximum<1000>
  >() satisfies number as number;
  const sku2 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: product2Code,
      body: {
        sku_code: sku2Code,
        variant_combination: sku2VariantCombination,
        base_price: sku2BasePrice,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku2);

  // Step 6: Create and authenticate buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 7: Create shipping address
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 4 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: "United States",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // Step 8: Register payment method
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: "1234",
        expiry_month: 12,
        expiry_year: 2026,
        billing_name: RandomGenerator.name(),
        billing_postal_code: RandomGenerator.alphaNumeric(5),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 9: Add first product to cart with quantity 2
  const cartItem1Quantity = 2;
  const cartItem1 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku1.id,
          quantity: cartItem1Quantity,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);

  // Step 10: Add second product to cart with quantity 3
  const cartItem2Quantity = 3;
  const cartItem2 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku2.id,
          quantity: cartItem2Quantity,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);

  // Step 11: Create order from cart items
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem1.id, cartItem2.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 12: Validate order structure and calculations
  TestValidator.equals("order contains 2 items", order.items.length, 2);

  // Find order items corresponding to each cart item
  const orderItem1 = order.items.find(
    (item) => item.shopping_mall_sale_sku_id === sku1.id,
  );
  typia.assertGuard(orderItem1!);

  const orderItem2 = order.items.find(
    (item) => item.shopping_mall_sale_sku_id === sku2.id,
  );
  typia.assertGuard(orderItem2!);

  // Validate first order item
  TestValidator.equals(
    "item 1 product name captured",
    orderItem1.product_name,
    product1.title,
  );
  TestValidator.equals(
    "item 1 SKU code captured",
    orderItem1.sku_code,
    sku1Code,
  );
  TestValidator.equals(
    "item 1 unit price correct",
    orderItem1.unit_price,
    sku1BasePrice,
  );
  TestValidator.equals(
    "item 1 quantity correct",
    orderItem1.quantity,
    cartItem1Quantity,
  );
  TestValidator.equals(
    "item 1 line total correct",
    orderItem1.line_total,
    sku1BasePrice * cartItem1Quantity,
  );

  // Validate variant attributes for item 1
  if (
    orderItem1.variant_attributes !== null &&
    orderItem1.variant_attributes !== undefined
  ) {
    const parsedVariant1 = JSON.parse(orderItem1.variant_attributes);
    TestValidator.predicate(
      "item 1 variant attributes captured",
      typeof parsedVariant1 === "object",
    );
  }

  // Validate second order item
  TestValidator.equals(
    "item 2 product name captured",
    orderItem2.product_name,
    product2.title,
  );
  TestValidator.equals(
    "item 2 SKU code captured",
    orderItem2.sku_code,
    sku2Code,
  );
  TestValidator.equals(
    "item 2 unit price correct",
    orderItem2.unit_price,
    sku2BasePrice,
  );
  TestValidator.equals(
    "item 2 quantity correct",
    orderItem2.quantity,
    cartItem2Quantity,
  );
  TestValidator.equals(
    "item 2 line total correct",
    orderItem2.line_total,
    sku2BasePrice * cartItem2Quantity,
  );

  // Validate variant attributes for item 2
  if (
    orderItem2.variant_attributes !== null &&
    orderItem2.variant_attributes !== undefined
  ) {
    const parsedVariant2 = JSON.parse(orderItem2.variant_attributes);
    TestValidator.predicate(
      "item 2 variant attributes captured",
      typeof parsedVariant2 === "object",
    );
  }

  // Validate order subtotal
  const expectedSubtotal = orderItem1.line_total + orderItem2.line_total;
  TestValidator.equals(
    "order subtotal equals sum of line totals",
    order.subtotal,
    expectedSubtotal,
  );

  // Validate order contains complete seller information
  TestValidator.predicate(
    "order has seller portions",
    order.sellers.length > 0,
  );
}
