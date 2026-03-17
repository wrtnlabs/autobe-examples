import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product search with name filtering and pagination.
 * Submit a request with name parameter set to a partial product name (e.g., "phone" to find "iPhone 15").
 * Verify the response returns products matching the search term with partial matching support.
 * Validate that pagination metadata (current page, total records, total pages) is correctly calculated.
 * Test navigating to different pages by changing the page parameter and verify results update accordingly.
 * Verify each product summary contains required fields: id, name, thumbnail, priceRangeMin, priceRangeMax, seller info, category info, averageRating, reviewCount, and isAvailable status.
 */
export async function test_api_ecommerce_mall_products_name_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search with name filter
  const searchTerm = "phone";
  const firstPageResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        name: searchTerm,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(firstPageResponse);
  // Validate pagination metadata matches request
  TestValidator.equals(
    "current page is 1",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    firstPageResponse.pagination.limit,
    10,
  );
  // Test 2: Verify search results contain the search term (case-insensitive partial match)
  if (firstPageResponse.data.length > 0) {
    for (const product of firstPageResponse.data) {
      TestValidator.predicate(
        `product name "${product.name}" contains search term "${searchTerm}"`,
        product.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    // Verify price range logic
    const product = firstPageResponse.data[0];
    TestValidator.predicate(
      "priceRangeMin <= priceRangeMax",
      product.priceRangeMin <= product.priceRangeMax,
    );
  }
  // Test 3: Test pagination navigation if multiple pages exist
  if (firstPageResponse.pagination.pages > 1) {
    const secondPageResponse =
      await api.functional.ecommerceMall.products.index(connection, {
        body: {
          name: searchTerm,
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      });
    typia.assert(secondPageResponse);
    TestValidator.equals(
      "second page current is 2",
      secondPageResponse.pagination.current,
      2,
    );
    // Verify pagination metadata is consistent across pages
    TestValidator.equals(
      "records count consistent",
      secondPageResponse.pagination.records,
      firstPageResponse.pagination.records,
    );
    TestValidator.equals(
      "pages count consistent",
      secondPageResponse.pagination.pages,
      firstPageResponse.pagination.pages,
    );
    // Verify page 2 has different data than page 1
    if (
      firstPageResponse.data.length > 0 &&
      secondPageResponse.data.length > 0
    ) {
      const firstPageIds = firstPageResponse.data.map((p) => p.id);
      const secondPageIds = secondPageResponse.data.map((p) => p.id);
      const hasDifferentData = secondPageIds.some(
        (id) => !firstPageIds.includes(id),
      );
      TestValidator.predicate(
        "page 2 has different data than page 1",
        hasDifferentData,
      );
    }
  }
  // Test 4: Test with different search term and limit
  const anotherSearchTerm = "laptop";
  const laptopResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        name: anotherSearchTerm,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(laptopResponse);
  // Validate different limit value
  TestValidator.equals("limit is 20", laptopResponse.pagination.limit, 20);
  // Verify laptop search results contain the search term
  for (const product of laptopResponse.data) {
    TestValidator.predicate(
      `product name "${product.name}" contains search term "${anotherSearchTerm}"`,
      product.name.toLowerCase().includes(anotherSearchTerm.toLowerCase()),
    );
  }
  // Test 5: Test with null name (no filter)
  const allProductsResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        name: null,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(allProductsResponse);
  TestValidator.predicate(
    "unfiltered results >= filtered results",
    allProductsResponse.pagination.records >=
      firstPageResponse.pagination.records,
  );
}
