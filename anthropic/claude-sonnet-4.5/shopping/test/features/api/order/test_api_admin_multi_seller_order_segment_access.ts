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
 * Test that administrators can access all seller segments within a multi-seller
 * order for comprehensive order management and dispute resolution.
 *
 * This test validates the admin's ability to retrieve and inspect individual
 * seller segments within orders that span multiple sellers. It creates a
 * realistic scenario where a buyer purchases products from two different
 * sellers in a single transaction, then verifies that administrators have
 * complete visibility into each seller's portion.
 *
 * Test workflow:
 *
 * 1. Set up admin account for platform governance
 * 2. Create two seller accounts and their product listings
 * 3. Create buyer account and complete multi-seller purchase
 * 4. Admin retrieves both seller segments sequentially
 * 5. Validate complete segment data access for oversight capabilities
 */
export async function test_api_admin_multi_seller_order_segment_access(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for order oversight
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

  // Step 2: Create shared product category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create first seller account
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
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
  typia.assert(seller1);

  // Step 4: Seller 1 creates product sale and SKU
  const sale1Code = RandomGenerator.alphaNumeric(12);
  const sale1 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: sale1Code,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 14,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale1);

  const sku1Code = RandomGenerator.alphaNumeric(16);
  const sku1 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale1Code,
      body: {
        sku_code: sku1Code,
        variant_combination: JSON.stringify({ Color: "Red", Size: "Medium" }),
        base_price: typia.random<number & tags.Minimum<0>>(),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku1);

  // Step 5: Create second seller account
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
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
  typia.assert(seller2);

  // Step 6: Seller 2 creates product sale and SKU
  const sale2Code = RandomGenerator.alphaNumeric(12);
  const sale2 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: sale2Code,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale2);

  const sku2Code = RandomGenerator.alphaNumeric(16);
  const sku2 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale2Code,
      body: {
        sku_code: sku2Code,
        variant_combination: JSON.stringify({ Color: "Blue", Size: "Large" }),
        base_price: typia.random<number & tags.Minimum<0>>(),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku2);

  // Step 7: Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 8: Buyer adds both sellers' products to cart
  const cartItem1 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku1.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
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
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);

  // Step 9: Buyer creates delivery address
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

  // Step 10: Buyer registers payment method
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
              tags.Type<"int32"> &
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
              tags.Type<"int32"> &
              tags.Minimum<10000> &
              tags.Maximum<99999>
          >()
          .toString(),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 11: Buyer creates multi-seller order
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem1.id, cartItem2.id],
        buyer_address_id: deliveryAddress.id,
        payment_method_id: paymentMethod.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Validate order contains two seller segments
  TestValidator.equals(
    "order should have two seller segments",
    order.sellers.length,
    2,
  );

  // Step 12: Switch to admin authentication with correct password
  const adminLoginResult = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLoginResult);

  // Step 13: Admin retrieves first seller segment
  const sellerSegment1Id = typia.assert(order.sellers[0].id!);
  const retrievedSegment1 =
    await api.functional.shoppingMall.admin.orders.sellers.at(connection, {
      orderId: order.id,
      sellerId: sellerSegment1Id,
    });
  typia.assert(retrievedSegment1);

  // Validate first seller segment data
  TestValidator.equals(
    "segment 1 ID matches",
    retrievedSegment1.id,
    sellerSegment1Id,
  );
  TestValidator.equals(
    "segment 1 parent order",
    retrievedSegment1.shopping_mall_order_id,
    order.id,
  );
  TestValidator.predicate(
    "segment 1 has items",
    retrievedSegment1.items.length > 0,
  );
  TestValidator.predicate(
    "segment 1 has valid subtotal",
    retrievedSegment1.subtotal >= 0,
  );

  // Step 14: Admin retrieves second seller segment
  const sellerSegment2Id = typia.assert(order.sellers[1].id!);
  const retrievedSegment2 =
    await api.functional.shoppingMall.admin.orders.sellers.at(connection, {
      orderId: order.id,
      sellerId: sellerSegment2Id,
    });
  typia.assert(retrievedSegment2);

  // Validate second seller segment data
  TestValidator.equals(
    "segment 2 ID matches",
    retrievedSegment2.id,
    sellerSegment2Id,
  );
  TestValidator.equals(
    "segment 2 parent order",
    retrievedSegment2.shopping_mall_order_id,
    order.id,
  );
  TestValidator.predicate(
    "segment 2 has items",
    retrievedSegment2.items.length > 0,
  );
  TestValidator.predicate(
    "segment 2 has valid subtotal",
    retrievedSegment2.subtotal >= 0,
  );

  // Validate segments belong to different sellers
  TestValidator.notEquals(
    "segments belong to different sellers",
    retrievedSegment1.shopping_mall_seller_id,
    retrievedSegment2.shopping_mall_seller_id,
  );
}
