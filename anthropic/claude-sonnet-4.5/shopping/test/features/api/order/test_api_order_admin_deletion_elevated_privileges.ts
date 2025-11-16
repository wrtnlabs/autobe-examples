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
 * Test that administrators can soft-delete orders regardless of state with
 * elevated privileges.
 *
 * This test validates admin's broader deletion capabilities for system
 * maintenance, dispute resolution, and compliance purposes. Unlike buyers who
 * can only delete orders in specific states (pending, payment_failed),
 * administrators have elevated permissions to delete orders in any state for
 * operational needs.
 *
 * Test workflow:
 *
 * 1. Create buyer account and complete order setup
 * 2. Create seller account and product listing
 * 3. Create admin account with elevated permissions
 * 4. Buyer creates and completes order (progressing to payment_confirmed state)
 * 5. Admin soft-deletes the order regardless of its state
 * 6. Verify deleted_at timestamp is set correctly
 * 7. Validate all related records are preserved for audit trails
 */
export async function test_api_order_admin_deletion_elevated_privileges(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 2: Create delivery address for order
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

  // Step 3: Create payment method for order
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

  // Step 4: Create admin account for category creation
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
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 5: Create category
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

  // Step 6: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.content({ paragraphs: 2 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 7: Create product sale listing
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
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

  // Step 8: Create SKU for the product
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        variant_combination: JSON.stringify({ Color: "Blue", Size: "Medium" }),
        base_price: typia.random<number & tags.Minimum<0>>(),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 9: Switch to buyer account and add product to cart
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
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

  // Step 10: Create order from cart
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

  // Verify order is in a state beyond buyer deletion permissions
  TestValidator.predicate(
    "order status is payment_confirmed or beyond",
    order.status === "payment_confirmed" ||
      order.status === "processing" ||
      order.status === "ready_to_ship",
  );

  // Step 11: Switch to admin account
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 12: Admin soft-deletes the order
  const deletedOrder = await api.functional.shoppingMall.admin.orders.erase(
    connection,
    {
      orderId: order.id,
    },
  );
  typia.assert(deletedOrder);

  // Step 13: Verify deleted_at timestamp is set
  TestValidator.predicate(
    "deleted_at timestamp should be set after admin deletion",
    deletedOrder.deleted_at !== null && deletedOrder.deleted_at !== undefined,
  );

  // Step 14: Verify order ID remains the same (soft deletion, not physical deletion)
  TestValidator.equals(
    "order ID unchanged after deletion",
    deletedOrder.id,
    order.id,
  );

  // Step 15: Verify all order fields are preserved
  TestValidator.equals(
    "order number preserved",
    deletedOrder.order_number,
    order.order_number,
  );
  TestValidator.equals(
    "buyer ID preserved",
    deletedOrder.shopping_mall_buyer_id,
    order.shopping_mall_buyer_id,
  );
  TestValidator.equals(
    "delivery address preserved",
    deletedOrder.shopping_mall_buyer_address_id,
    order.shopping_mall_buyer_address_id,
  );

  // Step 16: Verify financial totals are preserved for audit
  TestValidator.equals(
    "subtotal preserved",
    deletedOrder.subtotal,
    order.subtotal,
  );
  TestValidator.equals(
    "total amount preserved",
    deletedOrder.total_amount,
    order.total_amount,
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

  // Step 17: Verify seller sub-orders are preserved
  TestValidator.equals(
    "seller sub-orders count preserved",
    deletedOrder.sellers.length,
    order.sellers.length,
  );

  // Step 18: Verify order items are preserved for audit trail
  TestValidator.equals(
    "order items count preserved",
    deletedOrder.items.length,
    order.items.length,
  );

  // Step 19: Verify timestamps are maintained
  TestValidator.equals(
    "created_at unchanged",
    deletedOrder.created_at,
    order.created_at,
  );
  TestValidator.predicate(
    "updated_at is recent",
    new Date(deletedOrder.updated_at).getTime() >=
      new Date(order.updated_at).getTime(),
  );
}
