import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_browse_subcategories_by_parent_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test fetching top-level categories (parentId: null)
  const topLevelResponse = typia.assert<IPageIEcommerceMallCategory.ISummary>(
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        parentId: null,
        limit: 100,
      } satisfies IEcommerceMallCategory.IRequest,
    }),
  );
  // 2. Get a parent category ID to test subcategory filtering
  // If no categories exist, use a random UUID to test empty result
  const parentCategoryId =
    topLevelResponse.data.length > 0
      ? topLevelResponse.data[0].id
      : typia.random<string & tags.Format<"uuid">>();
  // 3. Get subcategories by filtering with parentId
  const subcategoriesResponse =
    typia.assert<IPageIEcommerceMallCategory.ISummary>(
      await api.functional.ecommerceMall.categories.index(connection, {
        body: {
          parentId: parentCategoryId,
          limit: 10,
        } satisfies IEcommerceMallCategory.IRequest,
      }),
    );
  // 4. Verify all returned subcategories have the correct parent_id
  for (const category of subcategoriesResponse.data) {
    TestValidator.equals(
      "subcategory parent_id matches",
      category.parent?.id,
      parentCategoryId,
    );
  }
  // 5. Verify pagination metadata (note: nested pagination structure)
  TestValidator.predicate(
    "pagination current page is valid",
    subcategoriesResponse.pagination.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    subcategoriesResponse.pagination.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    subcategoriesResponse.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    subcategoriesResponse.pagination.pagination.pages >= 0,
  );
  // 6. Verify pages calculation matches records and limit
  const expectedPages = Math.max(
    0,
    Math.ceil(subcategoriesResponse.pagination.pagination.records / 10),
  );
  TestValidator.equals(
    "pages calculation is correct",
    subcategoriesResponse.pagination.pagination.pages,
    expectedPages,
  );
  // 7. Test pagination - request page 2 if there are enough records
  if (subcategoriesResponse.pagination.pagination.pages > 1) {
    const page2Response = typia.assert<IPageIEcommerceMallCategory.ISummary>(
      await api.functional.ecommerceMall.categories.index(connection, {
        body: {
          parentId: parentCategoryId,
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallCategory.IRequest,
      }),
    );
    TestValidator.equals(
      "page 2 has same limit",
      page2Response.pagination.pagination.limit,
      10,
    );
    TestValidator.equals(
      "page 2 records matches",
      page2Response.pagination.pagination.records,
      subcategoriesResponse.pagination.pagination.records,
    );
    TestValidator.equals(
      "page 2 current is 2",
      page2Response.pagination.pagination.current,
      2,
    );
  }
  // 8. Test with non-existent UUID (should return empty array)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const emptyResponse = typia.assert<IPageIEcommerceMallCategory.ISummary>(
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        parentId: nonExistentId,
        limit: 10,
      } satisfies IEcommerceMallCategory.IRequest,
    }),
  );
  TestValidator.equals(
    "empty result for non-existent parent",
    emptyResponse.data.length,
    0,
  );
  // 9. Test without parentId filter (all categories)
  const allCategoriesResponse =
    typia.assert<IPageIEcommerceMallCategory.ISummary>(
      await api.functional.ecommerceMall.categories.index(connection, {
        body: {
          limit: 50,
        } satisfies IEcommerceMallCategory.IRequest,
      }),
    );
  TestValidator.predicate(
    "all categories response has data",
    allCategoriesResponse.data.length > 0,
  );
}
