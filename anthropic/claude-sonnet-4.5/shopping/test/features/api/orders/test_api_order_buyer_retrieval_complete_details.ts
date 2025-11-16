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
 * Test comprehensive buyer order retrieval functionality in a multi-actor
 * shopping mall scenario.
 *
 * This test validates the complete workflow from product listing creation
 * through order placement to order retrieval, ensuring buyers can access
 * complete order details including all nested relationships and calculated
 * fields.
 *
 * Workflow:
 *
 * 1. Admin creates product category for marketplace organization
 * 2. Seller registers and creates product sale listing with SKU variant
 * 3. Buyer registers and adds product to shopping cart
 * 4. Buyer creates delivery address and payment method
 * 5. Buyer completes checkout to create order
 * 6. Buyer retrieves order details and validates completeness
 */
export async function test_api_order_buyer_retrieval_complete_details(
  connection: api.IConnection,
) {
  // Step 1: Admin creates product category
  await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 2: Seller registration and product creation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.seller.join(connection, {
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

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 14,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        variant_combination: JSON.stringify({ Color: "Black", Size: "Medium" }),
        base_price: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 3: Buyer registration and cart operations
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });

  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // Step 4: Create delivery address and payment method
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
          postal_code: RandomGenerator.alphaNumeric(6),
          country: "South Korea",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(deliveryAddress);

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
        >() satisfies number as number,
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >() satisfies number as number,
        billing_name: RandomGenerator.name(),
        billing_postal_code: RandomGenerator.alphaNumeric(5),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 5: Create order from cart
  const createdOrder = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: deliveryAddress.id,
        payment_method_id: paymentMethod.id,
        notes: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(createdOrder);

  // Step 6: Retrieve order details and validate completeness
  const retrievedOrder = await api.functional.shoppingMall.buyer.orders.at(
    connection,
    {
      orderId: createdOrder.id,
    },
  );
  typia.assert(retrievedOrder);

  // Validate order basic information
  TestValidator.equals(
    "retrieved order ID matches created order",
    retrievedOrder.id,
    createdOrder.id,
  );
  TestValidator.equals(
    "order number is set",
    retrievedOrder.order_number,
    createdOrder.order_number,
  );
  TestValidator.predicate(
    "order status is valid",
    retrievedOrder.status.length > 0,
  );

  // Validate buyer information
  TestValidator.equals(
    "buyer ID matches",
    retrievedOrder.shopping_mall_buyer_id,
    createdOrder.shopping_mall_buyer_id,
  );
  TestValidator.predicate(
    "buyer summary is included",
    retrievedOrder.buyer !== null && retrievedOrder.buyer !== undefined,
  );
  if (retrievedOrder.buyer) {
    TestValidator.equals(
      "buyer email matches",
      retrievedOrder.buyer.email,
      buyerEmail,
    );
  }

  // Validate delivery address
  TestValidator.equals(
    "delivery address ID matches",
    retrievedOrder.shopping_mall_buyer_address_id,
    deliveryAddress.id,
  );
  TestValidator.predicate(
    "delivery address summary is included",
    retrievedOrder.deliveryAddress !== null &&
      retrievedOrder.deliveryAddress !== undefined,
  );
  if (retrievedOrder.deliveryAddress) {
    TestValidator.equals(
      "delivery address recipient matches",
      retrievedOrder.deliveryAddress.recipient_name,
      deliveryAddress.recipient_name,
    );
    TestValidator.equals(
      "delivery address city matches",
      retrievedOrder.deliveryAddress.city,
      deliveryAddress.city,
    );
  }

  // Validate order totals
  TestValidator.predicate(
    "subtotal is non-negative",
    retrievedOrder.subtotal >= 0,
  );
  TestValidator.predicate(
    "shipping total is non-negative",
    retrievedOrder.shipping_total >= 0,
  );
  TestValidator.predicate(
    "tax total is non-negative",
    retrievedOrder.tax_total >= 0,
  );
  TestValidator.predicate(
    "discount total is non-negative",
    retrievedOrder.discount_total >= 0,
  );
  TestValidator.predicate(
    "total amount is non-negative",
    retrievedOrder.total_amount >= 0,
  );

  // Validate order items array
  TestValidator.predicate(
    "order items array exists",
    Array.isArray(retrievedOrder.items),
  );
  TestValidator.predicate(
    "order has at least one item",
    retrievedOrder.items.length > 0,
  );

  // Validate first order item details
  const firstItem = retrievedOrder.items[0];
  typia.assertGuard(firstItem!);
  TestValidator.predicate(
    "order item has product name",
    firstItem.product_name.length > 0,
  );
  TestValidator.predicate(
    "order item has SKU code",
    firstItem.sku_code.length > 0,
  );
  TestValidator.predicate(
    "order item has unit price",
    firstItem.unit_price >= 0,
  );
  TestValidator.predicate("order item has quantity", firstItem.quantity > 0);
  TestValidator.predicate(
    "order item has line total",
    firstItem.line_total >= 0,
  );

  // Validate sellers array
  TestValidator.predicate(
    "sellers array exists",
    Array.isArray(retrievedOrder.sellers),
  );
  TestValidator.predicate(
    "order has at least one seller segment",
    retrievedOrder.sellers.length > 0,
  );

  // Validate first seller segment
  const firstSeller = retrievedOrder.sellers[0];
  typia.assertGuard(firstSeller!);
  TestValidator.predicate(
    "seller segment has sub-order number",
    firstSeller.sub_order_number.length > 0,
  );
  TestValidator.predicate(
    "seller segment has status",
    firstSeller.status.length > 0,
  );
  TestValidator.predicate(
    "seller segment has subtotal",
    firstSeller.subtotal >= 0,
  );
  TestValidator.predicate(
    "seller segment has shipping cost",
    firstSeller.shipping_cost >= 0,
  );

  // Validate timestamps
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedOrder.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedOrder.updated_at.length > 0,
  );

  // Validate that retrieved order matches created order in all critical aspects
  TestValidator.equals(
    "retrieved order matches created order",
    retrievedOrder.id,
    createdOrder.id,
  );
  TestValidator.equals(
    "order totals match",
    retrievedOrder.total_amount,
    createdOrder.total_amount,
  );
  TestValidator.equals(
    "order status matches",
    retrievedOrder.status,
    createdOrder.status,
  );
}
