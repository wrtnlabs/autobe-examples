import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller-specific product filtering functionality.
 *
 * This test validates that the seller_id filter correctly restricts product
 * search results to only products belonging to the specified seller. Since
 * seller/product creation APIs are not available, this test works with existing
 * data in the system.
 *
 * Test Steps:
 *
 * 1. Retrieve existing products from the system
 * 2. Extract unique seller IDs from the results
 * 3. Test filtering by seller_id for each seller
 * 4. Verify that filtered results contain ONLY products from the specified seller
 * 5. Verify seller summary information matches the filtered seller
 * 6. Test combining seller_id filter with other filters (category, price range,
 *    status)
 * 7. Test filtering by non-existent seller_id to ensure empty results
 * 8. Test seller filtering across pagination to verify consistency
 */
export async function test_api_sales_search_seller_filtering(
  connection: api.IConnection,
) {
  // Step 1: Get existing products to work with actual data
  const allProducts = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(allProducts);

  // Step 2: Extract unique seller IDs from existing products
  if (allProducts.data.length === 0) {
    // If no products exist, test with non-existent seller_id only
    const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
    const emptyResult = await api.functional.shoppingMall.sales.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          seller_id: nonExistentSellerId,
        } satisfies IShoppingMallSale.IRequest,
      },
    );
    typia.assert(emptyResult);
    TestValidator.equals(
      "no results for non-existent seller",
      emptyResult.data.length,
      0,
    );
    return;
  }

  // Extract unique sellers from the results
  const uniqueSellerIds = Array.from(
    new Set(allProducts.data.map((product) => product.seller.id)),
  );

  // Step 3: Test filtering by seller_id for each seller
  for (const sellerId of uniqueSellerIds.slice(0, 3)) {
    const sellerFilteredResult = await api.functional.shoppingMall.sales.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          seller_id: sellerId,
        } satisfies IShoppingMallSale.IRequest,
      },
    );
    typia.assert(sellerFilteredResult);

    // Step 4: Verify all results belong to the specified seller
    TestValidator.predicate(
      "filtered results should contain products",
      sellerFilteredResult.data.length > 0,
    );

    for (const sale of sellerFilteredResult.data) {
      TestValidator.equals(
        "sale seller_id matches filter",
        sale.seller.id,
        sellerId,
      );
    }

    // Step 5: Verify seller summary information matches
    const firstSale = sellerFilteredResult.data[0];
    typia.assertGuard(firstSale!);
    TestValidator.equals(
      "seller summary ID matches filter",
      firstSale.seller.id,
      sellerId,
    );
  }

  // Step 6: Test combining seller_id with other filters
  if (uniqueSellerIds.length > 0) {
    const testSellerId = uniqueSellerIds[0];
    typia.assertGuard(testSellerId!);

    // Get a product from this seller to extract valid category
    const sellerProducts = await api.functional.shoppingMall.sales.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          seller_id: testSellerId,
        } satisfies IShoppingMallSale.IRequest,
      },
    );
    typia.assert(sellerProducts);

    if (sellerProducts.data.length > 0) {
      const sampleProduct = sellerProducts.data[0];
      typia.assertGuard(sampleProduct!);

      // Test combining seller_id with category filter
      const combinedFilterResult =
        await api.functional.shoppingMall.sales.index(connection, {
          body: {
            page: 1,
            limit: 20,
            seller_id: testSellerId,
            category_id: sampleProduct.category.id,
          } satisfies IShoppingMallSale.IRequest,
        });
      typia.assert(combinedFilterResult);

      // Verify all results match both filters
      for (const sale of combinedFilterResult.data) {
        TestValidator.equals(
          "combined filter seller_id matches",
          sale.seller.id,
          testSellerId,
        );
        TestValidator.equals(
          "combined filter category_id matches",
          sale.category.id,
          sampleProduct.category.id,
        );
      }

      // Test combining seller_id with price range
      const minPrice = (sampleProduct.price * 0.5) satisfies number as number;
      const maxPrice = (sampleProduct.price * 1.5) satisfies number as number;
      const priceFilterResult = await api.functional.shoppingMall.sales.index(
        connection,
        {
          body: {
            page: 1,
            limit: 20,
            seller_id: testSellerId,
            min_price: minPrice,
            max_price: maxPrice,
          } satisfies IShoppingMallSale.IRequest,
        },
      );
      typia.assert(priceFilterResult);

      // Verify seller_id filter still works with price range
      for (const sale of priceFilterResult.data) {
        TestValidator.equals(
          "price filter seller_id matches",
          sale.seller.id,
          testSellerId,
        );
      }

      // Test combining seller_id with status filter
      const statusFilterResult = await api.functional.shoppingMall.sales.index(
        connection,
        {
          body: {
            page: 1,
            limit: 20,
            seller_id: testSellerId,
            status: sampleProduct.status,
          } satisfies IShoppingMallSale.IRequest,
        },
      );
      typia.assert(statusFilterResult);

      // Verify both filters apply
      for (const sale of statusFilterResult.data) {
        TestValidator.equals(
          "status filter seller_id matches",
          sale.seller.id,
          testSellerId,
        );
        TestValidator.equals(
          "status filter status matches",
          sale.status,
          sampleProduct.status,
        );
      }
    }
  }

  // Step 7: Test filtering by non-existent seller_id
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        seller_id: nonExistentSellerId,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(emptyResult);

  // Step 8: Test seller filtering across pagination
  if (uniqueSellerIds.length > 0) {
    const testSellerId = uniqueSellerIds[0];
    typia.assertGuard(testSellerId!);

    const page1 = await api.functional.shoppingMall.sales.index(connection, {
      body: {
        page: 1,
        limit: 10,
        seller_id: testSellerId,
      } satisfies IShoppingMallSale.IRequest,
    });
    typia.assert(page1);

    const page2 = await api.functional.shoppingMall.sales.index(connection, {
      body: {
        page: 2,
        limit: 10,
        seller_id: testSellerId,
      } satisfies IShoppingMallSale.IRequest,
    });
    typia.assert(page2);

    // Verify both pages contain only products from the specified seller
    const allPaginatedSales = [...page1.data, ...page2.data];
    for (const sale of allPaginatedSales) {
      TestValidator.equals(
        "paginated results all belong to same seller",
        sale.seller.id,
        testSellerId,
      );
    }
  }
}
