import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test comprehensive wishlist search functionality with various filter
 * combinations.
 *
 * This test validates the wishlist search API's ability to filter items using
 * multiple criteria including product name search, category filtering, price
 * range, and date filters. The test ensures buyers can efficiently find
 * specific wishlist items through various search and filtering mechanisms.
 *
 * Workflow steps:
 *
 * 1. Create buyer, admin, and seller accounts for multi-actor scenario
 * 2. Admin creates multiple product categories for category filter testing
 * 3. Seller creates diverse products across categories with varying prices
 * 4. Seller creates SKU variants with different price points
 * 5. Buyer adds multiple products to wishlist with diverse characteristics
 * 6. Test product name search filter (partial text matching)
 * 7. Test category filter (filtering by specific category ID)
 * 8. Test price range filters (min_price and max_price)
 * 9. Test date range filters (added_after and added_before)
 * 10. Test combined filters (category + price range)
 * 11. Verify pagination works correctly with filtered results
 */
export async function test_api_wishlist_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Create and authenticate admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
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

  // Step 3: Create multiple categories for filtering tests
  const categoryElectronics: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices and gadgets",
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(categoryElectronics);

  const categoryAccessories: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Accessories",
        slug: "accessories",
        description: "Computer and gaming accessories",
        display_order: 2,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(categoryAccessories);

  const categoryPeripherals: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Peripherals",
        slug: "peripherals",
        description: "Computer peripheral devices",
        display_order: 3,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(categoryPeripherals);

  // Step 4: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: "Tech Store Inc",
        business_description: RandomGenerator.content({ paragraphs: 2 }),
        store_name: "TechStore",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 5: Create products with different characteristics
  const productLaptop: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: `LAPTOP-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: categoryElectronics.id,
        title: "Gaming Laptop Pro",
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(productLaptop);

  const productMouse: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: `MOUSE-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: categoryAccessories.id,
        title: "Wireless Gaming Mouse",
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 14,
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(productMouse);

  const productKeyboard: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: `KEYBOARD-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: categoryPeripherals.id,
        title: "Mechanical Keyboard RGB",
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(productKeyboard);

  const productMonitor: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: `MONITOR-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: categoryElectronics.id,
        title: "4K Monitor Ultra HD",
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(productMonitor);

  const productHeadset: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: `HEADSET-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: categoryAccessories.id,
        title: "Premium Headset Wireless",
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 14,
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(productHeadset);

  // Step 6: Create SKUs with varying prices for price filter testing
  const skuLaptop: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: productLaptop.code,
      body: {
        sku_code: `${productLaptop.code}-SKU1`,
        variant_combination: JSON.stringify({}),
        base_price: 1000,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(skuLaptop);

  const skuMouse: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: productMouse.code,
      body: {
        sku_code: `${productMouse.code}-SKU1`,
        variant_combination: JSON.stringify({}),
        base_price: 50,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(skuMouse);

  const skuKeyboard: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: productKeyboard.code,
      body: {
        sku_code: `${productKeyboard.code}-SKU1`,
        variant_combination: JSON.stringify({}),
        base_price: 100,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(skuKeyboard);

  const skuMonitor: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: productMonitor.code,
      body: {
        sku_code: `${productMonitor.code}-SKU1`,
        variant_combination: JSON.stringify({}),
        base_price: 500,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(skuMonitor);

  const skuHeadset: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: productHeadset.code,
      body: {
        sku_code: `${productHeadset.code}-SKU1`,
        variant_combination: JSON.stringify({}),
        base_price: 200,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(skuHeadset);

  // Step 7: Switch back to buyer context and add items to wishlist
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: "test-password-12345",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  const wishlistItem1: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skuLaptop.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem1);

  const wishlistItem2: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skuMouse.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem2);

  const wishlistItem3: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skuKeyboard.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem3);

  const wishlistItem4: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skuMonitor.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem4);

  const wishlistItem5: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skuHeadset.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem5);

  // Step 8: Test product name search filter
  const searchResult: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          search: "Gaming",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search filter should return gaming products",
    searchResult.data.length === 2,
  );

  // Step 9: Test category filter
  const categoryFilterResult: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          category_id: categoryElectronics.id,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(categoryFilterResult);
  TestValidator.predicate(
    "category filter should return only electronics",
    categoryFilterResult.data.length === 2,
  );

  // Step 10: Test price range filters
  const priceRangeResult: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          min_price: 100,
          max_price: 500,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(priceRangeResult);
  TestValidator.predicate(
    "price range filter should return items between $100-$500",
    priceRangeResult.data.length === 3,
  );

  // Step 11: Test minimum price filter only
  const minPriceResult: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          min_price: 200,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(minPriceResult);
  TestValidator.predicate(
    "min price filter should return items >= $200",
    minPriceResult.data.length === 3,
  );

  // Step 12: Test maximum price filter only
  const maxPriceResult: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          max_price: 100,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(maxPriceResult);
  TestValidator.predicate(
    "max price filter should return items <= $100",
    maxPriceResult.data.length === 2,
  );

  // Step 13: Test combined filters (category + price range)
  const combinedFilterResult: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          category_id: categoryElectronics.id,
          min_price: 100,
          max_price: 1000,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters should return electronics in price range",
    combinedFilterResult.data.length === 2,
  );

  // Step 14: Test date range filters
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const dateFilterResult: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          added_after: oneHourAgo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(dateFilterResult);
  TestValidator.predicate(
    "date filter should return recently added items",
    dateFilterResult.data.length === 5,
  );

  // Step 15: Test empty filter (should return all items)
  const allItemsResult: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(allItemsResult);
  TestValidator.equals(
    "no filters should return all wishlist items",
    allItemsResult.pagination.records,
    5,
  );

  // Step 16: Test pagination with filters
  const paginatedResult: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination should limit results to page size",
    paginatedResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination should show correct total records",
    paginatedResult.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination should calculate correct page count",
    paginatedResult.pagination.pages,
    3,
  );

  // Step 17: Test filter with no matches
  const noMatchResult: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          search: "NonexistentProduct",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match filter should return empty results",
    noMatchResult.data.length,
    0,
  );
}
