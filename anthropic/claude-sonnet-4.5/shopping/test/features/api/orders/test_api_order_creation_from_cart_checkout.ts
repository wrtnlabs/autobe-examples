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
 * Test complete order creation workflow from cart checkout with payment
 * processing.
 *
 * This comprehensive E2E test validates the entire purchase flow in a
 * multi-actor e-commerce marketplace, from product setup through successful
 * order creation. The test covers admin category management, seller product
 * listing, buyer shopping cart operations, and order checkout with payment
 * processing.
 *
 * Workflow steps:
 *
 * 1. Admin authenticates and creates product category for marketplace organization
 * 2. Seller registers, authenticates, and creates product sale listing
 * 3. Seller creates SKU variants with pricing and inventory
 * 4. Buyer registers and authenticates to start shopping
 * 5. Buyer creates delivery address for order shipping
 * 6. Buyer registers payment method for checkout
 * 7. Buyer adds product SKUs to shopping cart
 * 8. Buyer creates order from cart items (main test operation)
 * 9. Validate order structure, totals, items, and buyer information
 */
export async function test_api_order_creation_from_cart_checkout(
  connection: api.IConnection,
) {
  // Step 1: Admin creates product category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com/home",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 2: Seller registration and authentication
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
      href: "https://marketplace.example.com/seller/register",
      referrer: "https://marketplace.example.com/seller/info",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 3: Seller creates product sale listing
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        brand: RandomGenerator.name(1),
        condition: "new",
        return_policy_days: 30,
        warranty_info: RandomGenerator.paragraph({ sentences: 5 }),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 4: Seller creates SKU variants
  const sku1 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: `${saleCode}-SKU1`,
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: 29.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku1);

  const sku2 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: `${saleCode}-SKU2`,
        variant_combination: JSON.stringify({ Color: "Blue", Size: "Medium" }),
        base_price: 24.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku2);

  // Step 5: Buyer registration and authentication
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shop.example.com/register",
      referrer: "https://shop.example.com/products",
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 6: Buyer creates delivery address
  const deliveryAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: `${typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<9999>>()} Main Street`,
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: typia
            .random<
              number &
                tags.Type<"int32"> &
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

  // Step 7: Buyer registers payment method
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: `tok_${RandomGenerator.alphaNumeric(24)}`,
        card_brand: "visa",
        last_four_digits: typia
          .random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<9999>
          >()
          .toString(),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2025> & tags.Maximum<2035>
        >(),
        billing_name: RandomGenerator.name(),
        billing_postal_code: typia
          .random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<10000> &
              tags.Maximum<99999>
          >()
          .toString(),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 8: Buyer adds products to shopping cart
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

  // Step 9: Buyer creates order from cart items (MAIN TEST OPERATION)
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem1.id, cartItem2.id],
        buyer_address_id: deliveryAddress.id,
        payment_method_id: paymentMethod.id,
        notes: "Please handle with care",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 10: Validate order structure and properties
  TestValidator.predicate(
    "order has unique order_number",
    order.order_number.length > 0,
  );

  TestValidator.equals(
    "order buyer ID matches authenticated buyer",
    order.shopping_mall_buyer_id,
    buyer.id,
  );

  TestValidator.equals(
    "order delivery address ID matches provided address",
    order.shopping_mall_buyer_address_id,
    deliveryAddress.id,
  );

  TestValidator.equals(
    "order buyer information matches",
    order.buyer.id,
    buyer.id,
  );

  TestValidator.equals(
    "order delivery address matches",
    order.deliveryAddress.id,
    deliveryAddress.id,
  );

  // Step 11: Validate order items
  TestValidator.equals("order has 2 items", order.items.length, 2);

  const orderItem1 = order.items.find(
    (item) => item.shopping_mall_sale_sku_id === sku1.id,
  );
  typia.assertGuard(orderItem1!);

  TestValidator.equals(
    "order item 1 quantity matches cart",
    orderItem1.quantity,
    cartItem1.quantity,
  );

  TestValidator.equals(
    "order item 1 unit price captured",
    orderItem1.unit_price,
    sku1.base_price,
  );

  TestValidator.equals(
    "order item 1 line total calculated correctly",
    orderItem1.line_total,
    orderItem1.unit_price * orderItem1.quantity,
  );

  const orderItem2 = order.items.find(
    (item) => item.shopping_mall_sale_sku_id === sku2.id,
  );
  typia.assertGuard(orderItem2!);

  TestValidator.equals(
    "order item 2 quantity matches cart",
    orderItem2.quantity,
    cartItem2.quantity,
  );

  TestValidator.equals(
    "order item 2 unit price captured",
    orderItem2.unit_price,
    sku2.base_price,
  );

  // Step 12: Validate order totals
  const expectedSubtotal = orderItem1.line_total + orderItem2.line_total;

  TestValidator.equals(
    "order subtotal calculated correctly",
    order.subtotal,
    expectedSubtotal,
  );

  TestValidator.predicate(
    "order shipping total is non-negative",
    order.shipping_total >= 0,
  );

  TestValidator.predicate(
    "order tax total is non-negative",
    order.tax_total >= 0,
  );

  TestValidator.predicate(
    "order discount total is non-negative",
    order.discount_total >= 0,
  );

  const expectedTotalAmount =
    order.subtotal +
    order.shipping_total +
    order.tax_total -
    order.discount_total;

  TestValidator.equals(
    "order total amount calculated correctly",
    order.total_amount,
    expectedTotalAmount,
  );

  // Step 13: Validate order status
  const validInitialStatuses = ["pending_payment", "payment_confirmed"];
  TestValidator.predicate(
    "order status is valid initial state",
    validInitialStatuses.includes(order.status),
  );

  // Step 14: Validate seller sub-orders
  TestValidator.predicate(
    "order has seller sub-orders",
    order.sellers.length > 0,
  );

  const sellerSubOrder = order.sellers[0];
  typia.assertGuard(sellerSubOrder!);

  TestValidator.equals(
    "seller sub-order references parent order",
    sellerSubOrder.shopping_mall_order_id,
    order.id,
  );

  TestValidator.equals(
    "seller sub-order references correct seller",
    sellerSubOrder.shopping_mall_seller_id,
    seller.id,
  );

  TestValidator.predicate(
    "seller sub-order has unique sub_order_number",
    sellerSubOrder.sub_order_number.length > 0,
  );

  TestValidator.predicate(
    "seller sub-order has items",
    sellerSubOrder.items.length > 0,
  );
}
