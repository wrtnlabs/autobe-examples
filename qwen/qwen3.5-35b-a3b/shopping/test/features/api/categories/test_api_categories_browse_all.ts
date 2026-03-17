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

/**
 * Test browsing all product categories via the public endpoint.
 * Validates pagination, hierarchy, sorting, and active-only filtering.
 */
export async function test_api_categories_browse_all(
  connection: api.IConnection,
): Promise<void> {
  // This is a PUBLIC endpoint (no authentication required)
  // We can use the base connection directly
  // 1. Make request to browse all active categories with default settings
  const output: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {},
    });
  typia.assert(output);
  // 2. Validate pagination metadata exists and is correct
  TestValidator.predicate(
    "pagination object exists",
    () => output.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has valid current page",
    () => output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid page size",
    () => output.pagination.limit >= 1 && output.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination has total records",
    () => output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    () => output.pagination.pages >= 0,
  );
  // 3. If there are categories, validate their structure and hierarchy
  if (output.data.length > 0) {
    // Validate each category has required fields
    for (const category of output.data) {
      // Validate is_active is present
      TestValidator.predicate(
        "category has is_active flag",
        () => category.is_active === true || category.is_active === false,
      );
      // Validate hierarchy: root categories have null parent, subcategories have parent
      if (category.parent_id === null || category.parent_id === undefined) {
        // Root category - parent should be null
        TestValidator.equals(
          "root category has null parent",
          category.parent,
          null,
        );
      } else {
        // Subcategory - parent should be populated
        if (category.parent !== null && category.parent !== undefined) {
          typia.assert(category.parent);
        }
      }
    }
    // 4. Validate categories are sorted by display_order ascending
    if (output.data.length > 1) {
      for (let i = 1; i < output.data.length; i++) {
        const prevOrder = output.data[i - 1].display_order;
        const currOrder = output.data[i].display_order;
        if (prevOrder !== undefined && currOrder !== undefined) {
          TestValidator.predicate(
            "categories sorted by display_order at index " + i,
            () => prevOrder <= currOrder,
          );
        }
      }
    }
    // 5. Validate only active categories are returned by default
    for (const category of output.data) {
      if (category.is_active !== undefined) {
        TestValidator.equals("category is active", category.is_active, true);
      }
    }
  } else {
    // 6. Handle empty results gracefully
    TestValidator.equals(
      "empty results have zero records",
      output.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty results have zero pages",
      output.pagination.pages,
      0,
    );
  }
  // 7. Test pagination with page_size parameter
  const testPageSize = 10;
  const outputWithPageSize: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        page_size: testPageSize satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    });
  typia.assert(outputWithPageSize);
  TestValidator.equals(
    "pagination respects page_size",
    outputWithPageSize.pagination.limit,
    testPageSize,
  );
  // 8. Test pagination with page parameter (next page)
  const outputPage2: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        page_size: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    });
  typia.assert(outputPage2);
  TestValidator.equals(
    "page 2 returns correct current page",
    outputPage2.pagination.current,
    2,
  );
}
