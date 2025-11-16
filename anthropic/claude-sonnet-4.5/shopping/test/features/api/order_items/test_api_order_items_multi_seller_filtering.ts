import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
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
 * Test order item retrieval with multi-seller filtering in complex marketplace
 * orders.
 *
 * This test validates the seller_id filtering capability that enables proper
 * item isolation in multi-seller orders where a single buyer order contains
 * products from multiple independent sellers. This functionality is critical
 * for seller dashboards (showing only their items for fulfillment) and buyer
 * order tracking (viewing items by seller).
 *
 * Test workflow:
 *
 * 1. Setup: Create admin, categories, and 3 independent sellers with products
 * 2. Multi-seller cart: Buyer adds items from all 3 sellers to cart
 * 3. Order placement: Create single order containing items from all sellers
 * 4. Filtering validation: Verify seller_id filter correctly isolates each
 *    seller's items
 * 5. Pagination testing: Validate filtering works with pagination parameters
 */
export async function test_api_order_items_multi_seller_filtering(
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
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product categories
  const category1 = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: "Electronics",
        slug: `electronics-${RandomGenerator.alphaNumeric(6)}`,
        description: "Electronic products and gadgets",
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category1);

  const category2 = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: "Clothing",
        slug: `clothing-${RandomGenerator.alphaNumeric(6)}`,
        description: "Fashion and apparel",
        display_order: 2,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category2);

  // Step 3: Create Seller A with products
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: "seller123",
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: "Seller A Electronics Co.",
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: `SellerA-${RandomGenerator.alphaNumeric(4)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerA);

  // Seller A creates product 1
  const saleA1 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `SALE-A1-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: category1.id,
        title: "Laptop by Seller A",
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(saleA1);

  // Create SKU for Seller A product 1
  const skuA1 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleA1.code,
      body: {
        sku_code: `SKU-A1-${RandomGenerator.alphaNumeric(6)}`,
        variant_combination: JSON.stringify({ Color: "Black", Size: "15inch" }),
        base_price: 1200,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(skuA1);

  // Seller A creates product 2
  const saleA2 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `SALE-A2-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: category1.id,
        title: "Headphones by Seller A",
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 14,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(saleA2);

  const skuA2 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleA2.code,
      body: {
        sku_code: `SKU-A2-${RandomGenerator.alphaNumeric(6)}`,
        variant_combination: JSON.stringify({ Color: "White" }),
        base_price: 150,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(skuA2);

  // Step 4: Create Seller B with products
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: "seller456",
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: "Seller B Fashion Ltd.",
      business_description: RandomGenerator.paragraph({ sentences: 12 }),
      store_name: `SellerB-${RandomGenerator.alphaNumeric(4)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerB);

  // Seller B creates product 1
  const saleB1 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `SALE-B1-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: category2.id,
        title: "T-Shirt by Seller B",
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(saleB1);

  const skuB1 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleB1.code,
      body: {
        sku_code: `SKU-B1-${RandomGenerator.alphaNumeric(6)}`,
        variant_combination: JSON.stringify({ Color: "Red", Size: "L" }),
        base_price: 35,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(skuB1);

  // Seller B creates product 2
  const saleB2 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `SALE-B2-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: category2.id,
        title: "Jeans by Seller B",
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(saleB2);

  const skuB2 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleB2.code,
      body: {
        sku_code: `SKU-B2-${RandomGenerator.alphaNumeric(6)}`,
        variant_combination: JSON.stringify({ Color: "Blue", Size: "32" }),
        base_price: 80,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(skuB2);

  // Step 5: Create Seller C with product
  const sellerCEmail = typia.random<string & tags.Format<"email">>();
  const sellerC = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerCEmail,
      password: "seller789",
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: "Seller C Gadgets Inc.",
      business_description: RandomGenerator.paragraph({ sentences: 8 }),
      store_name: `SellerC-${RandomGenerator.alphaNumeric(4)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerC);

  const saleC1 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `SALE-C1-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: category1.id,
        title: "Smartwatch by Seller C",
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 14,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(saleC1);

  const skuC1 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleC1.code,
      body: {
        sku_code: `SKU-C1-${RandomGenerator.alphaNumeric(6)}`,
        variant_combination: JSON.stringify({ Color: "Silver" }),
        base_price: 299,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(skuC1);

  // Step 6: Create buyer and authenticate
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: "buyer123",
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 7: Add items from all sellers to cart
  const cartItemA1 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skuA1.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemA1);

  const cartItemA2 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skuA2.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemA2);

  const cartItemB1 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skuB1.id,
          quantity: 3,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemB1);

  const cartItemB2 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skuB2.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemB2);

  const cartItemC1 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skuC1.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemC1);

  // Step 8: Create delivery address
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 3 }),
          city: "Seoul",
          state: "Seoul",
          postal_code: "12345",
          country: "South Korea",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // Step 9: Register payment method
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: `tok_${RandomGenerator.alphaNumeric(24)}`,
        card_brand: "visa",
        last_four_digits: "4242",
        expiry_month: 12,
        expiry_year: 2025,
        billing_name: buyer.full_name,
        billing_postal_code: "12345",
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 10: Create multi-seller order
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [
          cartItemA1.id,
          cartItemA2.id,
          cartItemB1.id,
          cartItemB2.id,
          cartItemC1.id,
        ],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
        notes: "Multi-seller test order",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Validate order has items from all sellers
  TestValidator.predicate(
    "order should have items from multiple sellers",
    order.items.length === 5,
  );

  // Extract seller IDs from order seller segments
  const sellerIds = order.sellers.map((s) => s.shopping_mall_seller_id);
  TestValidator.predicate(
    "order should have 3 distinct sellers",
    sellerIds.length === 3,
  );

  // Helper function to safely find seller segment
  const findSellerSegment = (sellerId: string) => {
    const segment = order.sellers.find(
      (s) => s.shopping_mall_seller_id === sellerId,
    );
    typia.assertGuard(segment!);
    return segment;
  };

  // Step 11: Retrieve all items without filtering (baseline)
  const allItems = await api.functional.shoppingMall.buyer.orders.items.index(
    connection,
    {
      orderId: order.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(allItems);

  TestValidator.equals(
    "all items count should match order items",
    allItems.data.length,
    5,
  );

  // Step 12: Filter by Seller A
  const sellerASegment = findSellerSegment(sellerA.id);
  const sellerAItems =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        seller_id: sellerA.id,
        page: 1,
        limit: 100,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sellerAItems);

  TestValidator.equals(
    "should have 2 items from Seller A",
    sellerAItems.data.length,
    2,
  );

  // Validate all returned items belong to Seller A
  for (const item of sellerAItems.data) {
    TestValidator.equals(
      "item should belong to Seller A segment",
      item.shopping_mall_order_seller_id,
      sellerASegment.id,
    );
  }

  // Step 13: Filter by Seller B
  const sellerBSegment = findSellerSegment(sellerB.id);
  const sellerBItems =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        seller_id: sellerB.id,
        page: 1,
        limit: 100,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sellerBItems);

  TestValidator.equals(
    "should have 2 items from Seller B",
    sellerBItems.data.length,
    2,
  );

  // Validate all returned items belong to Seller B
  for (const item of sellerBItems.data) {
    TestValidator.equals(
      "item should belong to Seller B segment",
      item.shopping_mall_order_seller_id,
      sellerBSegment.id,
    );
  }

  // Step 14: Filter by Seller C
  const sellerCSegment = findSellerSegment(sellerC.id);
  const sellerCItems =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        seller_id: sellerC.id,
        page: 1,
        limit: 100,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sellerCItems);

  TestValidator.equals(
    "should have 1 item from Seller C",
    sellerCItems.data.length,
    1,
  );

  // Validate item belongs to Seller C
  TestValidator.equals(
    "item should belong to Seller C segment",
    sellerCItems.data[0].shopping_mall_order_seller_id,
    sellerCSegment.id,
  );

  // Step 15: Test pagination with seller filtering
  const sellerAItemsPaged =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        seller_id: sellerA.id,
        page: 1,
        limit: 1,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sellerAItemsPaged);

  TestValidator.equals(
    "paginated result should return 1 item per page",
    sellerAItemsPaged.data.length,
    1,
  );

  TestValidator.equals(
    "pagination should show total of 2 records for Seller A",
    sellerAItemsPaged.pagination.records,
    2,
  );
}
