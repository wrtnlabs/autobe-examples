import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductSpecificationFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecificationFilter";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProduct";
export async function test_api_product_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Generate random search criteria with some optional fields
  const searchCriteria: ICommunityPlatformProduct.IRequest = {
    name: RandomGenerator.name(),
    price_min: typia.random<number & tags.Minimum<0>>(),
    price_max: typia.random<number & tags.Minimum<0>>(),
    in_stock: true,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformProduct.IRequest;
  // Ensure price_min <= price_max when both are provided
  if (
    searchCriteria.price_min !== undefined &&
    searchCriteria.price_max !== undefined
  ) {
    if (searchCriteria.price_min > searchCriteria.price_max) {
      searchCriteria.price_max = searchCriteria.price_min;
    }
  }
  // Execute first page request
  const firstPage: IPageICommunityPlatformProduct =
    await api.functional.communityPlatform.search.products.index(connection, {
      body: searchCriteria,
    });
  typia.assert(firstPage);
  // Execute second page request with same criteria but page=2
  const secondPage: IPageICommunityPlatformProduct =
    await api.functional.communityPlatform.search.products.index(connection, {
      body: {
        ...searchCriteria,
        page: 2,
      },
    });
  typia.assert(secondPage);
  // Ensure all data conforms to ICommunityPlatformProduct type
  firstPage.data.forEach((product) =>
    typia.assert<ICommunityPlatformProduct>(product),
  );
  secondPage.data.forEach((product) =>
    typia.assert<ICommunityPlatformProduct>(product),
  );
  // Validate that pages are non-overlapping (no duplicated products) using Set for efficiency
  const firstPageIds = new Set(firstPage.data.map((p) => p.id));
  const secondPageIds = new Set(secondPage.data.map((p) => p.id));
  // Verify no duplicates between pages
  TestValidator.predicate(
    "pages are non-overlapping",
    [...firstPageIds].every((id) => !secondPageIds.has(id)),
  );
  // Validate pagination metadata
  TestValidator.equals(
    "first page current matches request",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit matches request",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "second page current matches request",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit matches request",
    secondPage.pagination.limit,
    10,
  );
  // Validate total records and pages calculation
  const totalRecords = firstPage.pagination.records;
  const calculatePages = Math.ceil(totalRecords / 10);
  TestValidator.equals(
    "total records consistent across pages",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "calculated total pages matches actual",
    secondPage.pagination.pages,
    calculatePages,
  );
  // Validate record count is non-negative
  TestValidator.predicate("total records is non-negative", totalRecords >= 0);
  // Validate pages count is at least 1
  TestValidator.predicate(
    "total pages is at least 1",
    secondPage.pagination.pages >= 1,
  );
  // Validate page results don't exceed limit
  TestValidator.predicate(
    "first page has at most 10 products",
    firstPage.data.length <= 10,
  );
  TestValidator.predicate(
    "second page has at most 10 products",
    secondPage.data.length <= 10,
  );
  // Ensure all format validations pass
  firstPage.data.forEach((product) => {
    // Validate uuid format for id
    TestValidator.predicate(
      "product id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        product.id,
      ),
    );
    // Validate date-time format for created_at
    TestValidator.predicate(
      "created_at is valid ISO date-time",
      new Date(product.created_at).toISOString() === product.created_at,
    );
    // Validate uuid format for category_id
    TestValidator.predicate(
      "category_id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        product.category_id,
      ),
    );
    // Validate uuid format for owner_id
    TestValidator.predicate(
      "owner_id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        product.owner_id,
      ),
    );
    // Validate price is non-negative
    TestValidator.predicate("price is non-negative", product.price >= 0);
    // Validate stock_level is non-negative
    TestValidator.predicate(
      "stock_level is non-negative",
      product.stock_level >= 0,
    );
  });
}
