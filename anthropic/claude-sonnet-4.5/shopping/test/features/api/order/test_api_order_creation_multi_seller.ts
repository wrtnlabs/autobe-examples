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
 * Validate multi-seller order creation and automatic order splitting
 * functionality.
 *
 * This test ensures that when a buyer's shopping cart contains products from
 * multiple sellers, the system correctly splits the order into seller-specific
 * sub-orders while maintaining a unified buyer experience. Each seller receives
 * their portion of the order for independent fulfillment with separate tracking
 * and status management.
 *
 * Test workflow:
 *
 * 1. Admin creates product category for organization
 * 2. First seller registers and creates product with SKU
 * 3. Second seller registers and creates different product with SKU
 * 4. Buyer registers and sets up delivery address and payment method
 * 5. Buyer adds items from both sellers to shopping cart
 * 6. Buyer creates order from multi-seller cart
 * 7. Validate order is split into two seller sub-orders
 * 8. Verify each seller sub-order has correct seller assignment and items
 * 9. Confirm financial calculations are accurate across split orders
 */
export async function test_api_order_creation_multi_seller(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication and category creation
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

  // Step 2: First seller registration and product creation
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Password = typia.random<string & tags.MinLength<8>>();
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller1);

  const sale1Code = RandomGenerator.alphaNumeric(10);
  const sale1 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: sale1Code,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 14,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale1);

  const sku1 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale1Code,
      body: {
        sku_code: `${sale1Code}-SKU1`,
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: 50000,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku1);

  // Step 3: Second seller registration and product creation
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Password = typia.random<string & tags.MinLength<8>>();
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller2);

  const sale2Code = RandomGenerator.alphaNumeric(10);
  const sale2 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: sale2Code,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale2);

  const sku2 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale2Code,
      body: {
        sku_code: `${sale2Code}-SKU1`,
        variant_combination: JSON.stringify({ Color: "Blue", Size: "Medium" }),
        base_price: 75000,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku2);

  // Step 4: Buyer registration and setup
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

  // Create delivery address
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
          postal_code: RandomGenerator.alphaNumeric(5),
          country: "South Korea",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // Register payment method
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: "1234",
        expiry_month: 12,
        expiry_year: 2025,
        billing_name: RandomGenerator.name(),
        billing_postal_code: RandomGenerator.alphaNumeric(5),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 5: Add items from both sellers to cart
  const cartItem1 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku1.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);

  const cartItem2 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku2.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);

  // Step 6: Create multi-seller order
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

  // Step 7: Validate multi-seller order splitting
  TestValidator.equals(
    "order should have exactly 2 seller sub-orders",
    order.sellers.length,
    2,
  );

  // Step 8: Verify seller sub-order assignments and item distribution
  const sellerSubOrder1 = order.sellers.find(
    (s) => s.shopping_mall_seller_id === seller1.id,
  );
  const sellerSubOrder2 = order.sellers.find(
    (s) => s.shopping_mall_seller_id === seller2.id,
  );

  typia.assertGuard(sellerSubOrder1!);
  typia.assertGuard(sellerSubOrder2!);

  // Validate seller 1 sub-order
  TestValidator.equals(
    "seller 1 sub-order has correct seller ID",
    sellerSubOrder1.shopping_mall_seller_id,
    seller1.id,
  );
  TestValidator.predicate(
    "seller 1 sub-order has unique sub-order number",
    sellerSubOrder1.sub_order_number.length > 0,
  );
  TestValidator.equals(
    "seller 1 sub-order contains only seller 1 items",
    sellerSubOrder1.items.length,
    1,
  );
  TestValidator.equals(
    "seller 1 item SKU matches",
    sellerSubOrder1.items[0].shopping_mall_sale_sku_id,
    sku1.id,
  );
  TestValidator.equals(
    "seller 1 item quantity correct",
    sellerSubOrder1.items[0].quantity,
    2,
  );

  // Validate seller 2 sub-order
  TestValidator.equals(
    "seller 2 sub-order has correct seller ID",
    sellerSubOrder2.shopping_mall_seller_id,
    seller2.id,
  );
  TestValidator.predicate(
    "seller 2 sub-order has unique sub-order number",
    sellerSubOrder2.sub_order_number.length > 0,
  );
  TestValidator.equals(
    "seller 2 sub-order contains only seller 2 items",
    sellerSubOrder2.items.length,
    1,
  );
  TestValidator.equals(
    "seller 2 item SKU matches",
    sellerSubOrder2.items[0].shopping_mall_sale_sku_id,
    sku2.id,
  );
  TestValidator.equals(
    "seller 2 item quantity correct",
    sellerSubOrder2.items[0].quantity,
    1,
  );

  // Step 9: Validate financial calculations
  const expectedSeller1Subtotal = sku1.base_price * 2;
  const expectedSeller2Subtotal = sku2.base_price * 1;

  TestValidator.equals(
    "seller 1 subtotal calculated correctly",
    sellerSubOrder1.subtotal,
    expectedSeller1Subtotal,
  );
  TestValidator.equals(
    "seller 2 subtotal calculated correctly",
    sellerSubOrder2.subtotal,
    expectedSeller2Subtotal,
  );

  const totalSubtotal = sellerSubOrder1.subtotal + sellerSubOrder2.subtotal;
  TestValidator.equals(
    "order subtotal matches sum of seller subtotals",
    order.subtotal,
    totalSubtotal,
  );

  const totalShipping =
    sellerSubOrder1.shipping_cost + sellerSubOrder2.shipping_cost;
  TestValidator.equals(
    "order shipping total matches sum of seller shipping",
    order.shipping_total,
    totalShipping,
  );

  // Verify independent sub-order numbers
  TestValidator.notEquals(
    "seller sub-orders have different sub-order numbers",
    sellerSubOrder1.sub_order_number,
    sellerSubOrder2.sub_order_number,
  );

  // Validate each seller can independently track their portion
  TestValidator.predicate(
    "seller 1 sub-order has independent status",
    typeof sellerSubOrder1.status === "string",
  );
  TestValidator.predicate(
    "seller 2 sub-order has independent status",
    typeof sellerSubOrder2.status === "string",
  );
}
