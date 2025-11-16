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

export async function test_api_admin_order_segment_oversight(
  connection: api.IConnection,
) {
  // Step 1: Admin joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Admin creates product category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 3: Seller joins and authenticates
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerData = {
    email: sellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.paragraph({ sentences: 10 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 4: Seller creates product sale listing
  const saleData = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    brand: RandomGenerator.name(1),
    condition: "new" as const,
    short_description: RandomGenerator.paragraph({
      sentences: 15,
      wordMin: 5,
      wordMax: 10,
    }),
    meta_keywords: RandomGenerator.paragraph({ sentences: 5 }),
    weight: typia.random<number & tags.Minimum<0>>(),
    dimension_length: typia.random<number & tags.Minimum<0>>(),
    dimension_width: typia.random<number & tags.Minimum<0>>(),
    dimension_height: typia.random<number & tags.Minimum<0>>(),
    manufacturer: RandomGenerator.name(2),
    return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
    warranty_info: RandomGenerator.paragraph({ sentences: 10 }),
    status: "published" as const,
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(sale);

  // Step 5: Seller creates SKU variant
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(10),
    variant_combination: JSON.stringify({
      Color: "Blue",
      Size: "Medium",
    }),
    base_price: typia.random<number & tags.Minimum<0>>(),
    compare_at_price: typia.random<number & tags.Minimum<0>>(),
    enabled: true,
  } satisfies IShoppingMallSaleSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: skuData,
    },
  );
  typia.assert(sku);

  // Step 6: Buyer joins and authenticates
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerData = {
    email: buyerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 7: Buyer adds product to cart
  const cartItemData = {
    shopping_mall_sale_sku_id: sku.id,
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: cartItemData,
      },
    );
  typia.assert(cartItem);

  // Step 8: Buyer creates delivery address
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: RandomGenerator.paragraph({ sentences: 3 }),
    street_address_line2: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(5),
    country: RandomGenerator.name(1),
    address_label: RandomGenerator.name(1),
    address_type: RandomGenerator.pick(["residential", "commercial"] as const),
    special_delivery_instructions: RandomGenerator.paragraph({ sentences: 5 }),
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: addressData,
      },
    );
  typia.assert(address);

  // Step 9: Buyer registers payment method
  const paymentMethodData = {
    payment_type: RandomGenerator.pick([
      "credit_card",
      "debit_card",
      "paypal",
    ] as const),
    provider: RandomGenerator.pick([
      "Stripe",
      "PayPal",
      "Square",
      "Braintree",
    ] as const),
    provider_token: RandomGenerator.alphaNumeric(32),
    card_brand: RandomGenerator.pick([
      "visa",
      "mastercard",
      "amex",
      "discover",
    ] as const),
    last_four_digits: RandomGenerator.alphaNumeric(4),
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
      body: paymentMethodData,
    });
  typia.assert(paymentMethod);

  // Step 10: Buyer places order
  const orderData = {
    cart_item_ids: [cartItem.id],
    buyer_address_id: address.id,
    payment_method_id: paymentMethod.id,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: orderData,
    },
  );
  typia.assert(order);

  // Step 11: Admin switches back to admin context
  const adminReauth = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminData.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminReauth);

  // Step 12: Validate order has seller segments before accessing
  TestValidator.predicate(
    "order has seller segments",
    order.sellers.length > 0,
  );

  const firstSellerSegment = order.sellers[0];
  typia.assertGuard(firstSellerSegment!);

  TestValidator.equals(
    "seller segment belongs to created seller",
    firstSellerSegment.shopping_mall_seller_id,
    seller.id,
  );

  // Step 13: Admin retrieves seller segment for oversight
  const sellerSegment =
    await api.functional.shoppingMall.admin.orders.sellers.at(connection, {
      orderId: order.id,
      sellerId: firstSellerSegment.id,
    });
  typia.assert(sellerSegment);

  // Step 14: Validate complete seller segment information
  TestValidator.equals(
    "seller segment belongs to correct order",
    sellerSegment.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "seller segment ID matches",
    sellerSegment.id,
    firstSellerSegment.id,
  );
  TestValidator.equals(
    "seller segment belongs to correct seller",
    sellerSegment.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.predicate(
    "seller segment has valid sub-order number",
    sellerSegment.sub_order_number.length > 0,
  );
  TestValidator.predicate(
    "seller segment status is valid",
    sellerSegment.status.length > 0,
  );
  TestValidator.predicate(
    "seller segment has order items",
    sellerSegment.items.length > 0,
  );
  TestValidator.predicate(
    "seller segment subtotal is valid",
    sellerSegment.subtotal >= 0,
  );
  TestValidator.predicate(
    "seller segment shipping cost is valid",
    sellerSegment.shipping_cost >= 0,
  );
  TestValidator.equals(
    "seller information matches",
    sellerSegment.seller.id,
    seller.id,
  );
}
