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
 * Validates seller order segment isolation in multi-seller orders.
 *
 * This test ensures that when a buyer places an order containing items from
 * multiple sellers, each seller can only access their own segment of the order
 * and cannot access other sellers' segments. This validates the authorization
 * and data isolation model for multi-seller order management.
 *
 * Test Flow:
 *
 * 1. Admin creates shared category
 * 2. Two sellers register and create products in the same category
 * 3. Buyer registers and purchases items from both sellers in single order
 * 4. Each seller retrieves their own segment successfully
 * 5. Each seller is denied access to the other seller's segment
 */
export async function test_api_seller_order_segment_multi_seller_isolation(
  connection: api.IConnection,
) {
  // Step 1: Admin creates shared category for both sellers' products
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
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 2: Create Seller A and their product
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = typia.random<string & tags.MinLength<8>>();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerA);

  const saleA = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `SALE-A-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 14,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(saleA);

  const skuA = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleA.code,
      body: {
        sku_code: `SKU-A-${RandomGenerator.alphaNumeric(6)}`,
        variant_combination: JSON.stringify({ Color: "Red", Size: "M" }),
        base_price: 50000,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(skuA);

  // Step 3: Create Seller B and their product
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = typia.random<string & tags.MinLength<8>>();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerB);

  const saleB = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `SALE-B-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(saleB);

  const skuB = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleB.code,
      body: {
        sku_code: `SKU-B-${RandomGenerator.alphaNumeric(6)}`,
        variant_combination: JSON.stringify({ Color: "Blue", Size: "L" }),
        base_price: 75000,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(skuB);

  // Step 4: Create buyer and place multi-seller order
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Add Seller A's product to cart
  const cartItemA =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skuA.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemA);

  // Add Seller B's product to cart
  const cartItemB =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skuB.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemB);

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
          postal_code: typia
            .random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10000> &
                tags.Maximum<99999>
            >()
            .toString(),
          country: "South Korea",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // Create payment method
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

  // Create multi-seller order
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItemA.id, cartItemB.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Validate order has two seller segments
  TestValidator.equals(
    "order should have two seller segments",
    order.sellers.length,
    2,
  );

  // Find seller segments
  const sellerASegment = order.sellers.find(
    (s) => s.shopping_mall_seller_id === sellerA.id,
  );
  const sellerBSegment = order.sellers.find(
    (s) => s.shopping_mall_seller_id === sellerB.id,
  );
  typia.assertGuard(sellerASegment!);
  typia.assertGuard(sellerBSegment!);

  // Step 5: Seller A retrieves their own segment successfully
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const retrievedSegmentA =
    await api.functional.shoppingMall.seller.orders.sellers.at(connection, {
      orderId: order.id,
      sellerId: sellerASegment.id,
    });
  typia.assert(retrievedSegmentA);

  // Validate Seller A's segment data
  TestValidator.equals(
    "seller A segment ID matches",
    retrievedSegmentA.id,
    sellerASegment.id,
  );
  TestValidator.equals(
    "seller A segment seller ID matches",
    retrievedSegmentA.shopping_mall_seller_id,
    sellerA.id,
  );
  TestValidator.predicate(
    "seller A segment has items",
    retrievedSegmentA.items.length > 0,
  );

  // Step 6: Seller A attempts to access Seller B's segment (should fail)
  await TestValidator.error(
    "seller A cannot access seller B segment",
    async () => {
      await api.functional.shoppingMall.seller.orders.sellers.at(connection, {
        orderId: order.id,
        sellerId: sellerBSegment.id,
      });
    },
  );

  // Step 7: Seller B retrieves their own segment successfully
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const retrievedSegmentB =
    await api.functional.shoppingMall.seller.orders.sellers.at(connection, {
      orderId: order.id,
      sellerId: sellerBSegment.id,
    });
  typia.assert(retrievedSegmentB);

  // Validate Seller B's segment data
  TestValidator.equals(
    "seller B segment ID matches",
    retrievedSegmentB.id,
    sellerBSegment.id,
  );
  TestValidator.equals(
    "seller B segment seller ID matches",
    retrievedSegmentB.shopping_mall_seller_id,
    sellerB.id,
  );
  TestValidator.predicate(
    "seller B segment has items",
    retrievedSegmentB.items.length > 0,
  );

  // Step 8: Seller B attempts to access Seller A's segment (should fail)
  await TestValidator.error(
    "seller B cannot access seller A segment",
    async () => {
      await api.functional.shoppingMall.seller.orders.sellers.at(connection, {
        orderId: order.id,
        sellerId: sellerASegment.id,
      });
    },
  );
}
