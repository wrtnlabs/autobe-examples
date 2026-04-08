import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_hierarchical_navigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch all categories to identify parent categories with subcategories
  const allCategoriesResponse =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        limit: 100,
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(allCategoriesResponse);
  // 2. Find categories with subcategories (parent categories)
  const parentCategories = allCategoriesResponse.data.filter(
    (category) => category.parent === null && category.subcategories_count > 0,
  );
  // 3. Test onlyParents filter - should return only top-level categories
  const topLevelResponse = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        onlyParents: true,
        limit: 100,
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(topLevelResponse);
  // Validate that onlyParents returns categories without parent
  for (const category of topLevelResponse.data) {
    TestValidator.equals(
      "category should have no parent",
      category.parent,
      null,
    );
  }
  // 4. Test parentId filter if parent categories exist
  if (parentCategories.length > 0) {
    const parentCategory = parentCategories[0];
    // Filter by parentId to get subcategories
    const subcategoriesResponse =
      await api.functional.ecommerceMall.categories.index(connection, {
        body: {
          parentId: parentCategory.id,
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallCategory.IRequest,
      });
    typia.assert(subcategoriesResponse);
    // Validate that all returned categories have the specified parent
    for (const category of subcategoriesResponse.data) {
      TestValidator.equals(
        "category parent should match filter",
        category.parent?.id,
        parentCategory.id,
      );
    }
    // Validate subcategories count matches
    TestValidator.equals(
      "returned subcategories count should match",
      subcategoriesResponse.data.length,
      parentCategory.subcategories_count,
    );
  }
  // 5. Test parentId with non-existent UUID (should return empty or error handled gracefully)
  const emptyResponse = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        parentId: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        limit: 100,
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(emptyResponse);
  // Non-existent parent should return empty data
  TestValidator.equals(
    "non-existent parentId should return empty data",
    emptyResponse.data.length,
    0,
  );
  // 6. Test combination of filters (should work together)
  if (parentCategories.length > 0) {
    const combinedResponse =
      await api.functional.ecommerceMall.categories.index(connection, {
        body: {
          onlyParents: false,
          limit: 50,
          page: 1,
        } satisfies IEcommerceMallCategory.IRequest,
      });
    typia.assert(combinedResponse);
    // Data should be limited to specified limit
    TestValidator.predicate(
      "combinedResponse data length should not exceed limit",
      combinedResponse.data.length <= 50,
    );
  }
}
