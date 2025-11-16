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
 * Validate that admin order deletion properly preserves all historical data for
 * compliance and audit purposes.
 *
 * This test ensures that soft deletion of orders maintains complete order
 * history including financial transactions, delivery information, and status
 * transitions. The test validates that deleted orders retain all critical data
 * for audit trails and regulatory compliance.
 *
 * Test workflow:
 *
 * 1. Create admin account and authenticate
 * 2. Create buyer account and authenticate
 * 3. Create seller account and authenticate
 * 4. Admin creates product category
 * 5. Seller creates product listing
 * 6. Seller creates SKU variants for the product
 * 7. Switch to buyer context
 * 8. Buyer creates shipping address
 * 9. Buyer creates payment method
 * 10. Buyer adds product to cart
 * 11. Buyer creates order from cart items
 * 12. Switch to admin context
 * 13. Admin performs soft deletion on the order
 * 14. Verify deleted_at timestamp is set
 * 15. Verify order ID and all foreign keys remain intact
 * 16. Verify order items are preserved with pricing snapshots
 * 17. Verify seller information and relationships preserved
 * 18. Verify buyer and address associations maintained
 * 19. Verify all financial totals remain accurate
 * 20. Verify order item and seller portion soft deletion timestamps
 */
export async function test_api_order_admin_deletion_data_preservation(
  connection: api.IConnection,
) {
  // 1. Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: "https://admin.example.com/register" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/home" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create buyer account and authenticate
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shop.example.com/register" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com/home" as string & tags.Format<"uri">,
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // 3. Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: "https://seller.example.com/register" as string &
        tags.Format<"uri">,
      referrer: "https://seller.example.com/info" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 4. Switch to admin context and create product category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/home" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        image_url: "https://example.com/category.jpg" as string &
          tags.Format<"uri">,
        display_order: 1,
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 5. Switch to seller context and create product listing
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://seller.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com/dashboard" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSeller.ILogin,
  });

  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: RandomGenerator.name(1),
        condition: "new" as const,
        short_description: RandomGenerator.paragraph({ sentences: 5 }),
        meta_keywords: RandomGenerator.paragraph({ sentences: 5 }),
        weight: typia.random<number & tags.Minimum<0>>(),
        dimension_length: typia.random<number & tags.Minimum<0>>(),
        dimension_width: typia.random<number & tags.Minimum<0>>(),
        dimension_height: typia.random<number & tags.Minimum<0>>(),
        manufacturer: RandomGenerator.name(2),
        return_policy_days: 30 as const,
        warranty_info: RandomGenerator.paragraph({ sentences: 3 }),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // 6. Seller creates SKU variants for the product
  const skuCode = RandomGenerator.alphaNumeric(8);
  const basePrice = typia.random<
    number & tags.Minimum<10> & tags.Maximum<1000>
  >();
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: skuCode,
        variant_combination: JSON.stringify({ Color: "Blue", Size: "Medium" }),
        base_price: basePrice,
        compare_at_price: (basePrice * 1.2) satisfies number as number,
        sale_price: (basePrice * 0.9) satisfies number as number,
        sale_start_at: new Date().toISOString(),
        sale_end_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        cost_price: (basePrice * 0.6) satisfies number as number,
        barcode: RandomGenerator.alphaNumeric(13),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // 7. Switch to buyer context
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: "https://shop.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com/cart" as string & tags.Format<"uri">,
    } satisfies IShoppingMallBuyer.ILogin,
  });

  // 8. Buyer creates shipping address
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
          special_delivery_instructions: RandomGenerator.paragraph({
            sentences: 2,
          }),
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // 9. Buyer creates payment method
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: typia
          .random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<9999>
          >()
          .toString(),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >(),
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

  // 10. Buyer adds product to cart
  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 11. Buyer creates order from cart items
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
        notes: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Validate order was created successfully with complete data
  TestValidator.predicate("order has valid ID", order.id.length > 0);
  TestValidator.predicate("order has items", order.items.length > 0);
  TestValidator.predicate(
    "order has seller portions",
    order.sellers.length > 0,
  );
  TestValidator.predicate("order has positive subtotal", order.subtotal > 0);
  TestValidator.predicate(
    "order has valid total amount",
    order.total_amount > 0,
  );

  // 12. Switch to admin context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/orders" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 13. Admin performs soft deletion on the order
  const deletedOrder = await api.functional.shoppingMall.admin.orders.erase(
    connection,
    {
      orderId: order.id,
    },
  );
  typia.assert(deletedOrder);

  // 14. Verify deleted_at timestamp is set
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedOrder.deleted_at !== null && deletedOrder.deleted_at !== undefined,
  );

  // 15. Verify order ID and all foreign keys remain intact
  TestValidator.equals("order ID preserved", deletedOrder.id, order.id);
  TestValidator.equals(
    "buyer ID preserved",
    deletedOrder.shopping_mall_buyer_id,
    order.shopping_mall_buyer_id,
  );
  TestValidator.equals(
    "buyer address ID preserved",
    deletedOrder.shopping_mall_buyer_address_id,
    order.shopping_mall_buyer_address_id,
  );

  // 16. Verify order items are preserved with pricing snapshots
  TestValidator.predicate(
    "order items preserved",
    deletedOrder.items.length > 0,
  );
  TestValidator.equals(
    "same number of items",
    deletedOrder.items.length,
    order.items.length,
  );

  const deletedItem = deletedOrder.items[0];
  const originalItem = order.items[0];
  typia.assertGuard(deletedItem!);
  typia.assertGuard(originalItem!);

  TestValidator.equals("item ID preserved", deletedItem.id, originalItem.id);
  TestValidator.equals(
    "item SKU ID preserved",
    deletedItem.shopping_mall_sale_sku_id,
    originalItem.shopping_mall_sale_sku_id,
  );
  TestValidator.equals(
    "item unit price preserved",
    deletedItem.unit_price,
    originalItem.unit_price,
  );
  TestValidator.equals(
    "item quantity preserved",
    deletedItem.quantity,
    originalItem.quantity,
  );
  TestValidator.equals(
    "item line total preserved",
    deletedItem.line_total,
    originalItem.line_total,
  );
  TestValidator.equals(
    "item product name preserved",
    deletedItem.product_name,
    originalItem.product_name,
  );
  TestValidator.equals(
    "item SKU code preserved",
    deletedItem.sku_code,
    originalItem.sku_code,
  );

  // Verify order item soft deletion timestamp
  TestValidator.predicate(
    "order item deleted_at is set",
    deletedItem.deleted_at !== null && deletedItem.deleted_at !== undefined,
  );

  // 17. Verify seller information and relationships preserved
  TestValidator.predicate(
    "seller portions preserved",
    deletedOrder.sellers.length > 0,
  );
  TestValidator.equals(
    "same number of seller portions",
    deletedOrder.sellers.length,
    order.sellers.length,
  );

  const deletedSellerPortion = deletedOrder.sellers[0];
  const originalSellerPortion = order.sellers[0];
  typia.assertGuard(deletedSellerPortion!);
  typia.assertGuard(originalSellerPortion!);

  TestValidator.equals(
    "seller portion ID preserved",
    deletedSellerPortion.id,
    originalSellerPortion.id,
  );
  TestValidator.equals(
    "seller ID preserved",
    deletedSellerPortion.shopping_mall_seller_id,
    originalSellerPortion.shopping_mall_seller_id,
  );
  TestValidator.equals(
    "seller subtotal preserved",
    deletedSellerPortion.subtotal,
    originalSellerPortion.subtotal,
  );
  TestValidator.equals(
    "seller shipping cost preserved",
    deletedSellerPortion.shipping_cost,
    originalSellerPortion.shipping_cost,
  );

  // Verify seller portion soft deletion timestamp
  TestValidator.predicate(
    "seller portion deleted_at is set",
    deletedSellerPortion.deleted_at !== null &&
      deletedSellerPortion.deleted_at !== undefined,
  );

  // 18. Verify buyer and address associations maintained
  TestValidator.equals(
    "buyer summary preserved",
    deletedOrder.buyer.id,
    order.buyer.id,
  );
  TestValidator.equals(
    "buyer email preserved",
    deletedOrder.buyer.email,
    order.buyer.email,
  );
  TestValidator.equals(
    "buyer full name preserved",
    deletedOrder.buyer.full_name,
    order.buyer.full_name,
  );

  TestValidator.equals(
    "delivery address preserved",
    deletedOrder.deliveryAddress.id,
    order.deliveryAddress.id,
  );
  TestValidator.equals(
    "address recipient preserved",
    deletedOrder.deliveryAddress.recipient_name,
    order.deliveryAddress.recipient_name,
  );
  TestValidator.equals(
    "address street preserved",
    deletedOrder.deliveryAddress.street_address_line1,
    order.deliveryAddress.street_address_line1,
  );
  TestValidator.equals(
    "address city preserved",
    deletedOrder.deliveryAddress.city,
    order.deliveryAddress.city,
  );

  // 19. Verify all financial totals remain accurate
  TestValidator.equals(
    "subtotal preserved",
    deletedOrder.subtotal,
    order.subtotal,
  );
  TestValidator.equals(
    "shipping total preserved",
    deletedOrder.shipping_total,
    order.shipping_total,
  );
  TestValidator.equals(
    "tax total preserved",
    deletedOrder.tax_total,
    order.tax_total,
  );
  TestValidator.equals(
    "discount total preserved",
    deletedOrder.discount_total,
    order.discount_total,
  );
  TestValidator.equals(
    "total amount preserved",
    deletedOrder.total_amount,
    order.total_amount,
  );
  TestValidator.equals(
    "order status preserved",
    deletedOrder.status,
    order.status,
  );
  TestValidator.equals(
    "order number preserved",
    deletedOrder.order_number,
    order.order_number,
  );
}
