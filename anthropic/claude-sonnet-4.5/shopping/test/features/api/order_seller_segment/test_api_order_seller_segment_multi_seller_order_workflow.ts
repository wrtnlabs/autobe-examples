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
 * Test comprehensive multi-seller order workflow with seller segment retrieval.
 *
 * This test validates the complete multi-seller marketplace scenario where a
 * buyer's order containing items from multiple sellers is correctly split into
 * independent seller segments, and each segment can be retrieved and validated
 * independently.
 *
 * The test ensures:
 *
 * 1. Multiple sellers can list products in different categories
 * 2. Buyers can add items from multiple sellers to a single cart
 * 3. Order creation correctly splits items into seller-specific segments
 * 4. Each seller segment can be independently retrieved with correct item
 *    assignments
 * 5. Financial calculations are properly partitioned per seller
 * 6. Each seller segment maintains independent fulfillment tracking
 *
 * Workflow:
 *
 * 1. Admin creates product categories
 * 2. Multiple sellers register and create products
 * 3. Buyer registers, adds items from multiple sellers to cart
 * 4. Buyer places order with multi-seller items
 * 5. Retrieve and validate each seller segment independently
 */
export async function test_api_order_seller_segment_multi_seller_order_workflow(
  connection: api.IConnection,
) {
  // Step 1: Admin Setup - Create categories
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

  // Create multiple categories for diverse product listings
  const electronicsCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices and accessories",
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(electronicsCategory);

  const clothingCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Clothing",
        slug: "clothing",
        description: "Apparel and fashion items",
        display_order: 2,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(clothingCategory);

  // Step 2: Create multiple seller accounts
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Password = typia.random<string & tags.MinLength<8>>();
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      business_description: RandomGenerator.content({ paragraphs: 1 }),
      store_name: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller1);

  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Password = typia.random<string & tags.MinLength<8>>();
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      business_description: RandomGenerator.content({ paragraphs: 1 }),
      store_name: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller2);

  // Step 3: Seller 1 creates product in Electronics category
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const seller1Product = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: electronicsCategory.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(seller1Product);

  // Create SKU for seller1 product
  const seller1Sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: seller1Product.code,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        variant_combination: JSON.stringify({ Color: "Black", Size: "Medium" }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<5000>
        >() satisfies number as number,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(seller1Sku);

  // Step 4: Seller 2 creates product in Clothing category
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const seller2Product = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: clothingCategory.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 14,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(seller2Product);

  // Create SKU for seller2 product
  const seller2Sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: seller2Product.code,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        variant_combination: JSON.stringify({ Color: "Blue", Size: "Large" }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<5000>
        >() satisfies number as number,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(seller2Sku);

  // Step 5: Buyer registration and setup
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Create delivery address
  const deliveryAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 4 }),
          city: RandomGenerator.name(1),
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

  // Create payment method
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
        >() satisfies number as number,
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >() satisfies number as number,
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

  // Step 6: Add items from multiple sellers to cart
  const cartItem1 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: seller1Sku.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >() satisfies number as number,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);

  const cartItem2 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: seller2Sku.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >() satisfies number as number,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);

  // Step 7: Create multi-seller order
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

  // Validate that order was split into seller segments
  TestValidator.predicate(
    "order should have seller segments",
    order.sellers.length >= 2,
  );

  // Step 8: Retrieve and validate each seller segment independently
  const sellerSegments = order.sellers;

  // Validate seller segment 1
  const sellerSegment1 =
    await api.functional.shoppingMall.buyer.orders.sellers.at(connection, {
      orderId: order.id,
      sellerId: sellerSegments[0].shopping_mall_seller_id,
    });
  typia.assert(sellerSegment1);

  // Validate seller segment 2
  const sellerSegment2 =
    await api.functional.shoppingMall.buyer.orders.sellers.at(connection, {
      orderId: order.id,
      sellerId: sellerSegments[1].shopping_mall_seller_id,
    });
  typia.assert(sellerSegment2);

  // Validate that each segment contains only items from the correct seller
  TestValidator.predicate(
    "seller segment 1 should contain items from correct seller",
    sellerSegment1.items.every(
      (item) =>
        item.saleSku.sale.seller.id ===
        sellerSegments[0].shopping_mall_seller_id,
    ),
  );

  TestValidator.predicate(
    "seller segment 2 should contain items from correct seller",
    sellerSegment2.items.every(
      (item) =>
        item.saleSku.sale.seller.id ===
        sellerSegments[1].shopping_mall_seller_id,
    ),
  );

  // Validate that segments have correct sub-order numbers
  TestValidator.predicate(
    "seller segment 1 should have valid sub-order number",
    sellerSegment1.sub_order_number.startsWith("ORD-"),
  );

  TestValidator.predicate(
    "seller segment 2 should have valid sub-order number",
    sellerSegment2.sub_order_number.startsWith("ORD-"),
  );

  // Validate financial partitioning
  const segment1Subtotal = sellerSegment1.items.reduce(
    (sum, item) => sum + item.line_total,
    0,
  );
  TestValidator.equals(
    "seller segment 1 subtotal should match sum of its items",
    sellerSegment1.subtotal,
    segment1Subtotal,
  );

  const segment2Subtotal = sellerSegment2.items.reduce(
    (sum, item) => sum + item.line_total,
    0,
  );
  TestValidator.equals(
    "seller segment 2 subtotal should match sum of its items",
    sellerSegment2.subtotal,
    segment2Subtotal,
  );

  // Validate that sum of all seller subtotals equals parent order subtotal
  const totalSellerSubtotals = sellerSegments.reduce(
    (sum, segment) => sum + segment.subtotal,
    0,
  );
  TestValidator.equals(
    "sum of seller segment subtotals should equal parent order subtotal",
    order.subtotal,
    totalSellerSubtotals,
  );

  // Validate each seller segment has independent shipping information
  TestValidator.predicate(
    "seller segment 1 should have shipping method",
    sellerSegment1.shipping_method.length > 0,
  );

  TestValidator.predicate(
    "seller segment 2 should have shipping method",
    sellerSegment2.shipping_method.length > 0,
  );

  // Validate no item appears in multiple seller segments
  const allItemIds = sellerSegments.flatMap((segment) =>
    segment.items.map((item) => item.id),
  );
  const uniqueItemIds = new Set(allItemIds);
  TestValidator.equals(
    "all order items should be uniquely assigned to seller segments",
    allItemIds.length,
    uniqueItemIds.size,
  );

  // Validate seller segment IDs match the sellers who created the products
  TestValidator.predicate(
    "seller segments should reference correct sellers",
    sellerSegments.some(
      (segment) => segment.shopping_mall_seller_id === seller1.id,
    ) &&
      sellerSegments.some(
        (segment) => segment.shopping_mall_seller_id === seller2.id,
      ),
  );
}
