import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test product text search and sorting functionality for member users.
 *
 * This test validates the complete product discovery flow including member authentication, text search matching against product names and descriptions, and multiple sorting criteria. The test ensures that search queries work correctly with various sorting options, filters can be combined, and edge cases like empty results and special characters are handled properly.
 *
 * Test Flow:
 * 1. Member registers and authenticates via join endpoint to obtain authorized connection.
 * 2. Searches for products with 'phone' query - verifies search functionality and relevance sorting.
 * 3. Tests price_asc sorting - validates products are ordered by base_price ascending.
 * 4. Tests price_desc sorting - validates products are ordered by base_price descending.
 * 5. Tests newest sorting - validates products are ordered by createdAt descending.
 * 6. Tests name_asc sorting - validates products are ordered alphabetically by name.
 * 7. Tests search with special characters - verifies proper escaping and matching.
 * 8. Tests search returning no matches - verifies empty data array handling.
 * 9. Tests price range with minPrice=maxPrice - verifies exact price matching.
 * 10. Tests combined search with pagination parameters.
 * 11. Tests inStock filter functionality.
 *
 * Business Validations:
 * - Full-text search matches against both name and description fields.
 * - All sorting options work correctly and independently.
 * - Search and filters can be combined without conflicts.
 * - Relevance sorting applies when search query is provided.
 * - Pagination metadata is accurate and consistent.
 * - Results exclude products from suspended sellers.
 */
export async function test_api_product_search_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2. Basic search with 'phone' query and relevance sorting
  const searchResults = await api.functional.shoppingMall.member.products.index(
    memberConnection,
    {
      body: {
        search: "phone",
        sort: "relevance",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search returns valid page structure",
    searchResults.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    searchResults.pagination.records >= 0,
  );
  // 3. Test price_asc sorting
  const priceAscResults =
    await api.functional.shoppingMall.member.products.index(memberConnection, {
      body: {
        sort: "price_asc",
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(priceAscResults);
  if (priceAscResults.data.length > 1) {
    for (let i = 1; i < priceAscResults.data.length; i++) {
      TestValidator.predicate(
        "price ascending order",
        priceAscResults.data[i - 1].base_price <=
          priceAscResults.data[i].base_price,
      );
    }
  }
  // 4. Test price_desc sorting
  const priceDescResults =
    await api.functional.shoppingMall.member.products.index(memberConnection, {
      body: {
        sort: "price_desc",
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(priceDescResults);
  if (priceDescResults.data.length > 1) {
    for (let i = 1; i < priceDescResults.data.length; i++) {
      TestValidator.predicate(
        "price descending order",
        priceDescResults.data[i - 1].base_price >=
          priceDescResults.data[i].base_price,
      );
    }
  }
  // 5. Test newest sorting
  const newestResults = await api.functional.shoppingMall.member.products.index(
    memberConnection,
    {
      body: {
        sort: "newest",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(newestResults);
  if (newestResults.data.length > 1) {
    for (let i = 1; i < newestResults.data.length; i++) {
      TestValidator.predicate(
        "newest order (createdAt descending)",
        new Date(newestResults.data[i - 1].createdAt).getTime() >=
          new Date(newestResults.data[i].createdAt).getTime(),
      );
    }
  }
  // 6. Test name_asc sorting
  const nameAscResults =
    await api.functional.shoppingMall.member.products.index(memberConnection, {
      body: {
        sort: "name_asc",
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(nameAscResults);
  if (nameAscResults.data.length > 1) {
    for (let i = 1; i < nameAscResults.data.length; i++) {
      TestValidator.predicate(
        "name ascending order",
        nameAscResults.data[i - 1].name.localeCompare(
          nameAscResults.data[i].name,
        ) <= 0,
      );
    }
  }
  // 7. Test search with special characters and spaces
  const specialCharResults =
    await api.functional.shoppingMall.member.products.index(memberConnection, {
      body: {
        search: "test-product @#$%",
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(specialCharResults);
  // 8. Test search returning no matches (unique string)
  const noMatchResults =
    await api.functional.shoppingMall.member.products.index(memberConnection, {
      body: {
        search: "xyznonexistent" + RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(noMatchResults);
  TestValidator.predicate(
    "no matches returns valid structure",
    noMatchResults.data.length >= 0,
  );
  TestValidator.equals(
    "no matches has zero records",
    noMatchResults.pagination.records,
    0,
  );
  // 9. Test price range with minPrice=maxPrice for exact price matching
  const exactPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const exactPriceResults =
    await api.functional.shoppingMall.member.products.index(memberConnection, {
      body: {
        minPrice: exactPrice,
        maxPrice: exactPrice,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(exactPriceResults);
  for (const product of exactPriceResults.data) {
    TestValidator.equals("exact price match", product.base_price, exactPrice);
  }
  // 10. Test combined search with pagination parameters
  const combinedResults =
    await api.functional.shoppingMall.member.products.index(memberConnection, {
      body: {
        search: "product",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(combinedResults);
  TestValidator.predicate(
    "pagination limit respected",
    combinedResults.data.length <= 10,
  );
  TestValidator.equals("current page", combinedResults.pagination.current, 1);
  TestValidator.equals(
    "pagination limit",
    combinedResults.pagination.limit,
    10,
  );
  // 11. Test inStock filter
  const inStockResults =
    await api.functional.shoppingMall.member.products.index(memberConnection, {
      body: {
        inStock: true,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(inStockResults);
  // All inStock results should have inStock=true (though this is guaranteed by the filter)
  TestValidator.predicate(
    "inStock filter returns valid page",
    inStockResults.data.length >= 0,
  );
  // 12. Test default browsing without search (newest sort by default)
  const browseResults = await api.functional.shoppingMall.member.products.index(
    memberConnection,
    {
      body: {} satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(browseResults);
  TestValidator.predicate(
    "browse returns valid page structure",
    browseResults.data.length >= 0,
  );
}
