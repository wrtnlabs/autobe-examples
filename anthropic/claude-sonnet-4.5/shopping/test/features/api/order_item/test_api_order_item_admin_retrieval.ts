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
 * Validate that platform administrators can retrieve detailed information about
 * any order item in the system for customer support and dispute resolution
 * purposes.
 *
 * This test creates a complete order workflow involving three actors (admin,
 * seller, buyer), then validates that the admin can retrieve comprehensive
 * order item details including product information, SKU specifications, pricing
 * snapshots, and seller information.
 *
 * Workflow:
 *
 * 1. Create and authenticate admin account for platform management
 * 2. Create product category for marketplace organization
 * 3. Create and authenticate seller account to list products
 * 4. Create product sale listing with complete product information
 * 5. Create SKU variant for the product with pricing and configuration
 * 6. Create and authenticate buyer account for purchasing
 * 7. Add delivery address for order fulfillment
 * 8. Register payment method for checkout
 * 9. Add product SKU to shopping cart
 * 10. Create order from cart items
 * 11. Switch to admin context and retrieve order item details
 * 12. Validate complete order item information including product, SKU, pricing, and
 *     seller data
 */
export async function test_api_order_item_admin_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: "https://admin.shoppingmall.test/register",
      referrer: "https://admin.shoppingmall.test/home",
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
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
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
      href: "https://seller.shoppingmall.test/register",
      referrer: "https://seller.shoppingmall.test/info",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product sale
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 14,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create SKU variant
  const skuCode = `${saleCode}-RED-L`;
  const variantCombination = JSON.stringify({ Color: "Red", Size: "Large" });
  const basePrice = typia.random<
    number & tags.Minimum<0>
  >() satisfies number as number;
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleCode,
      body: {
        sku_code: skuCode,
        variant_combination: variantCombination,
        base_price: basePrice,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shop.shoppingmall.test/register",
      referrer: "https://shop.shoppingmall.test/products",
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 7: Add delivery address
  const deliveryAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: typia
            .random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10000> &
                tags.Maximum<99999>
            >()
            .toString(),
          country: "United States",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(deliveryAddress);

  // Step 8: Register payment method
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: "4242",
        expiry_month: 12,
        expiry_year: 2025,
        billing_name: RandomGenerator.name(),
        billing_postal_code: typia
          .random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<10000> &
              tags.Maximum<99999>
          >()
          .toString(),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 9: Add product to cart
  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // Step 10: Create order
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: deliveryAddress.id,
        payment_method_id: paymentMethod.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Validate order was created successfully with items
  TestValidator.predicate(
    "order should have at least one item",
    order.items.length > 0,
  );
  const firstOrderItem = order.items[0];
  typia.assertGuard(firstOrderItem!);

  // Step 11: Switch to admin context and retrieve order item details
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.shoppingmall.test/login",
      referrer: "https://admin.shoppingmall.test/dashboard",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const retrievedOrderItem =
    await api.functional.shoppingMall.admin.orders.items.at(connection, {
      orderId: order.id,
      itemId: firstOrderItem.id,
    });
  typia.assert(retrievedOrderItem);

  // Step 12: Validate comprehensive order item information
  TestValidator.equals(
    "retrieved order item ID matches",
    retrievedOrderItem.id,
    firstOrderItem.id,
  );
  TestValidator.equals(
    "product name preserved",
    retrievedOrderItem.product_name,
    sale.title,
  );
  TestValidator.equals(
    "SKU code preserved",
    retrievedOrderItem.sku_code,
    skuCode,
  );
  TestValidator.equals(
    "variant attributes preserved",
    retrievedOrderItem.variant_attributes,
    variantCombination,
  );
  TestValidator.equals(
    "unit price snapshot correct",
    retrievedOrderItem.unit_price,
    basePrice,
  );
  TestValidator.equals("quantity correct", retrievedOrderItem.quantity, 2);
  TestValidator.equals(
    "line total calculation correct",
    retrievedOrderItem.line_total,
    basePrice * 2,
  );
  TestValidator.equals(
    "SKU ID reference correct",
    retrievedOrderItem.shopping_mall_sale_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "order ID reference correct",
    retrievedOrderItem.shopping_mall_order_id,
    order.id,
  );
}
