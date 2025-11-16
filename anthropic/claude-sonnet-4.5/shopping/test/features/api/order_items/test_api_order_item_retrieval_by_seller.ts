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
 * Test seller's ability to retrieve detailed order item information from orders
 * containing their products.
 *
 * This test validates the complete e-commerce workflow from product listing
 * through order placement to order item retrieval by the seller. It ensures
 * sellers can access detailed information about specific items in orders for
 * fulfillment purposes.
 *
 * Workflow:
 *
 * 1. Admin creates marketplace infrastructure (category)
 * 2. Seller registers and creates product listing with SKU variant
 * 3. Buyer registers, adds product to cart, and completes checkout
 * 4. Seller retrieves detailed order item information
 * 5. Validate complete order item details including pricing, quantity, and product
 *    specifications
 */
export async function test_api_order_item_retrieval_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: "active",
        parent_id: null,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
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

  // Step 4: Seller creates product sale listing
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: RandomGenerator.name(1),
        condition: "new",
        return_policy_days: 30,
        warranty_info: RandomGenerator.paragraph({ sentences: 5 }),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Seller creates SKU variant
  const skuCode = `${saleCode}-VAR1`;
  const basePrice = typia.random<
    number & tags.Minimum<10> & tags.Maximum<1000>
  >() satisfies number as number;
  const purchaseQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: skuCode,
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: basePrice,
        compare_at_price: (basePrice * 1.2) satisfies number as number,
        sale_price: null,
        sale_start_at: null,
        sale_end_at: null,
        cost_price: (basePrice * 0.6) satisfies number as number,
        barcode: RandomGenerator.alphaNumeric(13),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Create buyer account and authenticate
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

  // Step 7: Buyer creates delivery address
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 3 }),
          street_address_line2: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(5),
          country: "United States",
          address_label: "Home",
          address_type: "residential",
          special_delivery_instructions: RandomGenerator.paragraph({
            sentences: 2,
          }),
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // Step 8: Buyer registers payment method
  const currentYear = new Date().getFullYear();
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: RandomGenerator.alphaNumeric(4),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
        expiry_year: (currentYear +
          typia.random<
            number & tags.Minimum<1> & tags.Maximum<5>
          >()) satisfies number as number,
        billing_name: RandomGenerator.name(),
        billing_postal_code: RandomGenerator.alphaNumeric(5),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 9: Buyer adds product SKU to cart
  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: purchaseQuantity,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // Step 10: Buyer creates order from cart items
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
        notes: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 11: Validate order has items before retrieval
  TestValidator.predicate("order contains items", order.items.length > 0);
  const firstOrderItem = typia.assert(order.items[0]!);

  // Step 12: Switch to seller context for order item retrieval
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 13: Seller retrieves order item details
  const retrievedOrderItem =
    await api.functional.shoppingMall.seller.orders.items.at(connection, {
      orderId: order.id,
      itemId: firstOrderItem.id,
    });
  typia.assert(retrievedOrderItem);

  // Step 14: Validate retrieved order item details
  TestValidator.equals(
    "retrieved order item ID matches",
    retrievedOrderItem.id,
    firstOrderItem.id,
  );
  TestValidator.equals(
    "order item belongs to correct order",
    retrievedOrderItem.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "order item SKU ID matches",
    retrievedOrderItem.shopping_mall_sale_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "product name preserved",
    retrievedOrderItem.product_name,
    sale.title,
  );
  TestValidator.equals(
    "SKU code preserved",
    retrievedOrderItem.sku_code,
    sku.sku_code,
  );
  TestValidator.equals(
    "unit price snapshot preserved",
    retrievedOrderItem.unit_price,
    cartItem.unit_price_snapshot,
  );
  TestValidator.equals(
    "quantity matches cart quantity",
    retrievedOrderItem.quantity,
    purchaseQuantity,
  );
  TestValidator.equals(
    "line total calculated correctly",
    retrievedOrderItem.line_total,
    retrievedOrderItem.unit_price * retrievedOrderItem.quantity,
  );
  TestValidator.predicate(
    "order item has SKU summary reference",
    retrievedOrderItem.saleSku !== null &&
      retrievedOrderItem.saleSku !== undefined,
  );
  TestValidator.equals(
    "SKU summary ID matches",
    retrievedOrderItem.saleSku.id,
    sku.id,
  );
}
