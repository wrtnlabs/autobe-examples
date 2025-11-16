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
 * Test complete buyer order item search and retrieval workflow with filtering,
 * sorting, and pagination.
 *
 * This test validates that buyers can successfully search, filter, sort, and
 * paginate through order items in their placed orders. It creates a realistic
 * e-commerce scenario with multiple actors (admin, seller, buyer), establishes
 * product catalog with categories and sales, creates SKU variants with
 * different configurations and pricing, processes cart checkout workflow, and
 * then extensively tests the order item search API with various filter
 * combinations, sort options, and pagination controls.
 *
 * The test ensures proper authorization (only order owner can access items),
 * validates that search filters work correctly (product name, price range,
 * seller filtering), confirms sorting produces correctly ordered results, and
 * verifies pagination metadata accuracy. It also validates that returned order
 * items contain accurate product information captured at purchase time
 * including product names, SKU codes, variant attributes, quantities, unit
 * prices, line totals, and discount amounts.
 *
 * Steps:
 *
 * 1. Create and authenticate buyer account for order placement
 * 2. Create and authenticate admin account for category setup
 * 3. Create product category for organizing sales
 * 4. Switch to admin context and create seller account
 * 5. Switch to seller context and create multiple product sales
 * 6. Create multiple SKU variants with different prices for each sale
 * 7. Switch back to buyer context
 * 8. Add multiple SKU items to shopping cart
 * 9. Create delivery address for order shipping
 * 10. Register payment method for checkout
 * 11. Create order from cart items
 * 12. Test order item retrieval with basic pagination
 * 13. Test product name search filtering
 * 14. Test price range filtering
 * 15. Test seller-specific filtering
 * 16. Test sorting by different fields (created_at, unit_price, quantity,
 *     line_total)
 * 17. Validate pagination metadata accuracy
 * 18. Verify returned item data completeness and accuracy
 */
export async function test_api_order_items_search_and_retrieval_by_buyer(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = "BuyerPass123!";
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shop.example.com/register",
      referrer: "https://shop.example.com/home",
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 2: Create and authenticate admin account for category setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com/dashboard",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices and accessories",
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPass123!";
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      business_description: RandomGenerator.content({ paragraphs: 1 }),
      store_name: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://seller.example.com/register",
      referrer: "https://seller.example.com/info",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 5: Seller creates multiple product sales with different prices
  const sale1 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `SALE-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale1);

  const sale2 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `SALE-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 14,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale2);

  const sale3 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `SALE-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "refurbished",
        return_policy_days: 7,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale3);

  // Step 6: Create multiple SKU variants with different prices for filtering
  const sku1 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale1.code,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: 50.0,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku1);

  const sku2 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale1.code,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
        variant_combination: JSON.stringify({ Color: "Blue", Size: "Medium" }),
        base_price: 75.0,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku2);

  const sku3 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale2.code,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
        variant_combination: JSON.stringify({ Color: "Green", Size: "Small" }),
        base_price: 100.0,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku3);

  const sku4 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale2.code,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
        variant_combination: JSON.stringify({ Color: "Yellow", Size: "Large" }),
        base_price: 120.0,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku4);

  const sku5 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale3.code,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
        variant_combination: JSON.stringify({ Color: "Black", Size: "Medium" }),
        base_price: 150.0,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku5);

  // Step 7: Switch back to buyer context
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/products",
    } satisfies IShoppingMallBuyer.ILogin,
  });

  // Step 8: Add multiple SKU items to shopping cart
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

  const cartItem3 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku3.id,
          quantity: 3,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem3);

  const cartItem4 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku4.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem4);

  const cartItem5 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku5.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem5);

  // Step 9: Create delivery address for order shipping
  const deliveryAddress =
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
  typia.assert(deliveryAddress);

  // Step 10: Register payment method for checkout
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
        billing_name: RandomGenerator.name(),
        billing_postal_code: "12345",
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 11: Create order from cart items
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [
          cartItem1.id,
          cartItem2.id,
          cartItem3.id,
          cartItem4.id,
          cartItem5.id,
        ],
        buyer_address_id: deliveryAddress.id,
        payment_method_id: paymentMethod.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  TestValidator.predicate("order should have items", order.items.length === 5);

  // Step 12: Test basic order item retrieval with pagination
  const basicResult =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(basicResult);
  TestValidator.predicate(
    "basic result should have items",
    basicResult.data.length === 5,
  );
  TestValidator.equals(
    "pagination current page",
    basicResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", basicResult.pagination.limit, 10);
  TestValidator.equals(
    "pagination total records",
    basicResult.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination total pages",
    basicResult.pagination.pages,
    1,
  );

  // Step 13: Test product name search filtering
  const firstItemName = order.items[0].product_name;
  const searchTerm = firstItemName.substring(0, 10);
  const searchResult =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        search: searchTerm,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(searchResult);
  TestValidator.predicate(
    "search should return matching items",
    searchResult.data.length > 0,
  );

  // Step 14: Test price range filtering (find items priced between 70 and 130)
  const priceRangeResult =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        min_price: 70,
        max_price: 130,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(priceRangeResult);
  TestValidator.predicate(
    "price range should filter correctly",
    priceRangeResult.data.length > 0,
  );

  // Validate all returned items are within price range
  for (const item of priceRangeResult.data) {
    TestValidator.predicate(
      "item unit price should be within range",
      item.unit_price >= 70 && item.unit_price <= 130,
    );
  }

  // Step 15: Test seller-specific filtering using seller sub-order ID
  const sellerSubOrderId = order.sellers[0].id;
  const sellerFilterResult =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        seller_id: sellerSubOrderId,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sellerFilterResult);
  TestValidator.predicate(
    "seller filter should return items",
    sellerFilterResult.data.length > 0,
  );

  // Validate all returned items belong to the specified seller
  for (const item of sellerFilterResult.data) {
    TestValidator.equals(
      "item should belong to filtered seller",
      item.shopping_mall_order_seller_id,
      sellerSubOrderId,
    );
  }

  // Step 16: Test sorting by unit_price ascending
  const sortedByPriceAsc =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "unit_price",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortedByPriceAsc);

  // Validate ascending price order
  for (let i = 0; i < sortedByPriceAsc.data.length - 1; i++) {
    TestValidator.predicate(
      "items should be sorted by price ascending",
      sortedByPriceAsc.data[i].unit_price <=
        sortedByPriceAsc.data[i + 1].unit_price,
    );
  }

  // Step 17: Test sorting by unit_price descending
  const sortedByPriceDesc =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "unit_price",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortedByPriceDesc);

  // Validate descending price order
  for (let i = 0; i < sortedByPriceDesc.data.length - 1; i++) {
    TestValidator.predicate(
      "items should be sorted by price descending",
      sortedByPriceDesc.data[i].unit_price >=
        sortedByPriceDesc.data[i + 1].unit_price,
    );
  }

  // Step 18: Test sorting by quantity
  const sortedByQuantity =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "quantity",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortedByQuantity);

  // Validate quantity sorting
  for (let i = 0; i < sortedByQuantity.data.length - 1; i++) {
    TestValidator.predicate(
      "items should be sorted by quantity ascending",
      sortedByQuantity.data[i].quantity <=
        sortedByQuantity.data[i + 1].quantity,
    );
  }

  // Step 19: Test sorting by line_total
  const sortedByLineTotal =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "line_total",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortedByLineTotal);

  // Validate line total sorting
  for (let i = 0; i < sortedByLineTotal.data.length - 1; i++) {
    TestValidator.predicate(
      "items should be sorted by line total descending",
      sortedByLineTotal.data[i].line_total >=
        sortedByLineTotal.data[i + 1].line_total,
    );
  }

  // Step 20: Validate returned item data completeness
  const firstItem = basicResult.data[0];
  TestValidator.predicate(
    "item should have product_name",
    firstItem.product_name.length > 0,
  );
  TestValidator.predicate(
    "item should have sku_code",
    firstItem.sku_code.length > 0,
  );
  TestValidator.predicate(
    "item should have valid quantity",
    firstItem.quantity > 0,
  );
  TestValidator.predicate(
    "item should have valid unit_price",
    firstItem.unit_price > 0,
  );
  TestValidator.predicate(
    "item should have valid line_total",
    firstItem.line_total > 0,
  );
  TestValidator.predicate(
    "item discount_amount should be non-negative",
    firstItem.discount_amount >= 0,
  );

  // Step 21: Test pagination with smaller page size
  const paginatedResult =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 2,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.equals(
    "paginated result should have 2 items",
    paginatedResult.data.length,
    2,
  );
  TestValidator.equals(
    "paginated total records should be 5",
    paginatedResult.pagination.records,
    5,
  );
  TestValidator.equals(
    "paginated total pages should be 3",
    paginatedResult.pagination.pages,
    3,
  );

  // Step 22: Test second page retrieval
  const secondPageResult =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        page: 2,
        limit: 2,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(secondPageResult);
  TestValidator.equals(
    "second page current",
    secondPageResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page should have 2 items",
    secondPageResult.data.length,
    2,
  );
}
