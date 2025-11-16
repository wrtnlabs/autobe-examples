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

export async function test_api_order_buyer_retrieval_price_snapshot(
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
      ip: null,
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
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account and authenticate
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
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product sale with initial pricing
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 30,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create SKU variant with specific base_price
  const originalPrice = 99.99;
  const skuCode = `${saleCode}-SKU-001`;
  const variantCombination = JSON.stringify({ Color: "Red", Size: "Large" });

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleCode,
      body: {
        sku_code: skuCode,
        variant_combination: variantCombination,
        base_price: originalPrice,
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
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 7: Add SKU to cart (capturing initial price snapshot)
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

  // Verify cart item captured the price snapshot
  TestValidator.equals(
    "cart item price snapshot matches SKU base price",
    cartItem.unit_price_snapshot,
    originalPrice,
  );

  // Step 8: Create delivery address
  const deliveryAddress =
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
          country: "United States",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(deliveryAddress);

  // Step 9: Register payment method
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: typia.random<
          string & tags.MinLength<4> & tags.MaxLength<4>
        >(),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >(),
        billing_name: RandomGenerator.name(),
        billing_postal_code: RandomGenerator.alphaNumeric(5),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 10: Create order from cart items (captures complete price snapshot)
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

  // Step 11: Retrieve the order to validate price snapshot preservation
  const retrievedOrder = await api.functional.shoppingMall.buyer.orders.at(
    connection,
    {
      orderId: order.id,
    },
  );
  typia.assert(retrievedOrder);

  // Validation: Verify order items captured product information at purchase time
  TestValidator.predicate("order has items", retrievedOrder.items.length > 0);

  const orderItem = retrievedOrder.items[0];
  typia.assertGuard(orderItem!);

  // Validate product_name snapshot
  TestValidator.equals(
    "product name captured at purchase",
    orderItem.product_name,
    sale.title,
  );

  // Validate sku_code snapshot
  TestValidator.equals(
    "SKU code captured at purchase",
    orderItem.sku_code,
    skuCode,
  );

  // Validate variant_attributes snapshot
  TestValidator.equals(
    "variant attributes captured at purchase",
    orderItem.variant_attributes,
    variantCombination,
  );

  // Validate unit_price snapshot matches original price
  TestValidator.equals(
    "unit price captured at purchase time",
    orderItem.unit_price,
    originalPrice,
  );

  // Validate line_total calculation from purchase time
  const expectedLineTotal = originalPrice * 2;
  TestValidator.equals(
    "line total calculated at purchase time",
    orderItem.line_total,
    expectedLineTotal,
  );

  // Validate discount_amount preservation
  TestValidator.predicate(
    "discount amount is non-negative",
    orderItem.discount_amount >= 0,
  );

  // Validate delivery address snapshot
  TestValidator.equals(
    "delivery address ID captured",
    retrievedOrder.shopping_mall_buyer_address_id,
    deliveryAddress.id,
  );
  TestValidator.equals(
    "delivery address recipient name preserved",
    retrievedOrder.deliveryAddress.recipient_name,
    deliveryAddress.recipient_name,
  );
  TestValidator.equals(
    "delivery address street preserved",
    retrievedOrder.deliveryAddress.street_address_line1,
    deliveryAddress.street_address_line1,
  );
  TestValidator.equals(
    "delivery address city preserved",
    retrievedOrder.deliveryAddress.city,
    deliveryAddress.city,
  );
  TestValidator.equals(
    "delivery address postal code preserved",
    retrievedOrder.deliveryAddress.postal_code,
    deliveryAddress.postal_code,
  );

  // Validate order totals are immutable
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

  // Validate order snapshot consistency
  TestValidator.equals(
    "retrieved order ID matches created order",
    retrievedOrder.id,
    order.id,
  );
  TestValidator.equals(
    "order number is preserved",
    retrievedOrder.order_number,
    order.order_number,
  );
  TestValidator.equals(
    "buyer ID is preserved",
    retrievedOrder.shopping_mall_buyer_id,
    buyer.id,
  );
}
