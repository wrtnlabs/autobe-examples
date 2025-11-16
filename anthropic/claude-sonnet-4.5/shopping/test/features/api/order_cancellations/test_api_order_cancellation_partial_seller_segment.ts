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
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test partial order cancellation workflow targeting a specific seller segment
 * in a multi-seller order.
 *
 * This test validates the marketplace's ability to handle partial cancellations
 * where a buyer cancels only one seller's portion of a multi-seller order while
 * leaving other sellers' portions intact. The test follows a complete business
 * workflow from multi-actor setup through order creation to partial
 * cancellation.
 *
 * Business workflow:
 *
 * 1. Create admin, buyer, and two seller accounts
 * 2. Admin creates product category
 * 3. Both sellers create products in the category
 * 4. Buyer adds items from both sellers to cart
 * 5. Buyer creates delivery address and payment method
 * 6. Buyer places order containing items from multiple sellers
 * 7. Buyer submits partial cancellation targeting one seller's sub-order
 * 8. Validate cancellation request creation with correct seller segment reference
 */
export async function test_api_order_cancellation_partial_seller_segment(
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
      href: "https://admin.marketplace.test/register",
      referrer: "https://admin.marketplace.test/home",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(10);
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://marketplace.test/register",
      referrer: "https://marketplace.test/",
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 3: Create first seller account
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Password = RandomGenerator.alphaNumeric(10);
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: `${RandomGenerator.name()} Corp`,
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: "https://seller.marketplace.test/register",
      referrer: "https://seller.marketplace.test/",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller1);

  // Step 4: Create second seller account
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Password = RandomGenerator.alphaNumeric(10);
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: `${RandomGenerator.name()} Inc`,
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: "https://seller.marketplace.test/register",
      referrer: "https://seller.marketplace.test/",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller2);

  // Step 5: Switch to admin and create category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.marketplace.test/login",
      referrer: "https://admin.marketplace.test/",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 6: Switch to seller1 and create product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      href: "https://seller.marketplace.test/login",
      referrer: "https://seller.marketplace.test/",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale1 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `SALE-${RandomGenerator.alphaNumeric(8)}`,
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
      saleCode: sale1.code,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        variant_combination: JSON.stringify({ Color: "Red", Size: "M" }),
        base_price: 50000,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku1);

  // Step 7: Switch to seller2 and create product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      href: "https://seller.marketplace.test/login",
      referrer: "https://seller.marketplace.test/",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale2 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `SALE-${RandomGenerator.alphaNumeric(8)}`,
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
      saleCode: sale2.code,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        variant_combination: JSON.stringify({ Color: "Blue", Size: "L" }),
        base_price: 75000,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku2);

  // Step 8: Switch to buyer and add items to cart
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: "https://marketplace.test/login",
      referrer: "https://marketplace.test/",
    } satisfies IShoppingMallBuyer.ILogin,
  });

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

  // Step 9: Create delivery address
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>()} ${RandomGenerator.name()} St`,
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
  typia.assert(address);

  // Step 10: Create payment method
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

  // Step 11: Create multi-seller order
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem1.id, cartItem2.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
        notes: "Please deliver as soon as possible",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Validate multi-seller order structure
  TestValidator.predicate(
    "order should have multiple seller sub-orders",
    order.sellers.length >= 2,
  );

  // Find seller1's sub-order
  const seller1SubOrder = order.sellers.find(
    (s) => s.shopping_mall_seller_id === seller1.id,
  );
  typia.assertGuard(seller1SubOrder!);

  // Step 12: Create partial cancellation targeting seller1's portion
  const cancellation =
    await api.functional.shoppingMall.buyer.cancellations.create(connection, {
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_order_seller_id: seller1SubOrder.id,
        cancellation_reason: "buyer_changed_mind",
        cancellation_explanation:
          "Found a better deal for this seller's products",
      } satisfies IShoppingMallOrderCancellation.ICreate,
    });
  typia.assert(cancellation);

  // Validate partial cancellation request
  TestValidator.equals(
    "cancellation references correct order",
    cancellation.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "cancellation targets specific seller sub-order",
    cancellation.shopping_mall_order_seller_id,
    seller1SubOrder.id,
  );
  TestValidator.equals(
    "cancellation reason is correct",
    cancellation.cancellation_reason,
    "buyer_changed_mind",
  );
  TestValidator.equals(
    "cancellation is in pending status",
    cancellation.approval_status,
    "pending",
  );
  TestValidator.equals(
    "cancellation requested by buyer",
    cancellation.requested_by_buyer_id,
    buyer.id,
  );
}
