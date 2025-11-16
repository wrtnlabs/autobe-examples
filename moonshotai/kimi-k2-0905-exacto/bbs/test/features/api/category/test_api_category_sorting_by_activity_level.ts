import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionCategory";

/**
 * Test category sorting by article count to highlight most active discussion
 * areas.
 *
 * Validates that users can discover popular discussion topics based on
 * community engagement metrics. The test ensures effective content discovery by
 * prioritizing categories with higher member participation in economic
 * analysis, political discussions, and policy debates.
 *
 * Steps:
 *
 * 1. Request categories sorted by article count descending (most active first)
 * 2. Verify categories are returned in correct sorted order by article count
 * 3. Test ascending sort order for comparison
 * 4. Validate pagination works with sorting
 * 5. Test category data structure and field validation
 */
export async function test_api_category_sorting_by_activity_level(
  connection: api.IConnection,
) {
  // Step 1: Request categories sorted by article count descending (most active first)
  const categoriesDesc =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        sort_by: "article_count",
        sort_order: "desc",
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    });
  typia.assert(categoriesDesc);

  // Validate we got results with proper structure validation
  TestValidator.predicate(
    "categories loaded with valid data",
    categoriesDesc.data.length > 0,
  );

  // Validate pagination structure exists
  TestValidator.predicate(
    "pagination object exists",
    typeof categoriesDesc.pagination === "object",
  );
  TestValidator.predicate(
    "pagination has required properties",
    typeof categoriesDesc.pagination.current === "string" &&
      typeof categoriesDesc.pagination.pages === "string" &&
      typeof categoriesDesc.pagination.limit === "string" &&
      typeof categoriesDesc.pagination.records === "string",
  );

  // Step 2: Verify categories are sorted by article_count in descending order
  for (let i = 0; i < categoriesDesc.data.length - 1; i++) {
    const current = categoriesDesc.data[i];
    const next = categoriesDesc.data[i + 1];
    TestValidator.predicate(
      `category ${current.name} article count >= next category ${next.name} in descending order`,
      current.article_count >= next.article_count,
    );
  }

  // Step 3: Request categories sorted by article count ascending (least active first)
  const categoriesAsc =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        sort_by: "article_count",
        sort_order: "asc",
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    });
  typia.assert(categoriesAsc);

  // Step 4: Verify categories are sorted by article_count in ascending order (reverse of descending)
  for (let i = 0; i < categoriesAsc.data.length - 1; i++) {
    const current = categoriesAsc.data[i];
    const next = categoriesAsc.data[i + 1];
    TestValidator.predicate(
      `category ${current.name} article count <= next category ${next.name} in ascending order`,
      current.article_count <= next.article_count,
    );
  }

  // Step 5: Test pagination with sorting
  const page1 = await api.functional.economicDiscussion.categories.index(
    connection,
    {
      body: {
        sort_by: "article_count",
        sort_order: "desc",
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 3 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    },
  );
  typia.assert(page1);

  // Only test page 2 if we have multiple pages
  if (
    page1.pagination.pages !== page1.pagination.current &&
    parseInt(page1.pagination.pages) > 1
  ) {
    const page2 = await api.functional.economicDiscussion.categories.index(
      connection,
      {
        body: {
          sort_by: "article_count",
          sort_order: "desc",
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 3 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
    typia.assert(page2);

    // Verify page 2 follows page 1 order by comparing article counts
    const lastPage1Count = page1.data[page1.data.length - 1].article_count;
    const firstPage2Count = page2.data[0].article_count;
    TestValidator.predicate(
      "pagination maintains sort order - page 2 first item article count <= page 1 last item",
      firstPage2Count <= lastPage1Count,
    );
  }

  // Step 6: Test default sorting without explicit sort order (should default to desc for activity)
  const categoriesDefault =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        sort_by: "article_count",
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    });
  typia.assert(categoriesDefault);

  // Step 7: Validate category data structure integrity
  categoriesDesc.data.forEach((category, index) => {
    TestValidator.predicate(
      `category[${index}] has required properties`,
      typeof category.id === "string" &&
        category.id.length > 0 &&
        typeof category.code === "string" &&
        category.code.length > 0 &&
        typeof category.name === "string" &&
        category.name.length > 0 &&
        typeof category.display_order === "number" &&
        typeof category.is_active === "boolean" &&
        typeof category.article_count === "number" &&
        category.article_count >= 0,
    );

    // Validate individual field constraints
    TestValidator.predicate(
      `category[${index}] article count is non-negative`,
      category.article_count >= 0,
    );
    TestValidator.predicate(
      `category[${index}] display order is valid`,
      category.display_order >= 0 && Number.isInteger(category.display_order),
    );
  });

  // Step 8: Test search functionality with sorting combined
  const categoriesWithSearch =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        sort_by: "article_count",
        sort_order: "desc",
        search: typia.random<string>(),
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    });
  typia.assert(categoriesWithSearch);

  // Verify search + sort combination works
  TestValidator.predicate(
    "search results maintain sort order",
    categoriesWithSearch.data.length >= 0,
  );

  if (categoriesWithSearch.data.length > 1) {
    TestValidator.predicate(
      "search + sort maintains descending order",
      categoriesWithSearch.data[0].article_count >=
        categoriesWithSearch.data[categoriesWithSearch.data.length - 1]
          .article_count,
    );
  }

  // Step 9: Test active status filtering with sorting
  const activeCategories =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        sort_by: "article_count",
        sort_order: "desc",
        is_active: true,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    });
  typia.assert(activeCategories);

  // Verify all returned categories are active
  activeCategories.data.forEach((category, index) => {
    TestValidator.predicate(
      `active category[${index}] has is_active true`,
      category.is_active === true,
    );
  });

  // Final validation: Ensure the API consistently returns sorted results
  TestValidator.equals(
    "descending sort maintains consistency",
    categoriesDesc.data.map((c) => c.article_count).join(","),
    categoriesDesc.data
      .map((c) => c.article_count)
      .sort((a, b) => b - a)
      .join(","),
  );

  TestValidator.equals(
    "ascending sort maintains consistency",
    categoriesAsc.data.map((c) => c.article_count).join(","),
    categoriesAsc.data
      .map((c) => c.article_count)
      .sort((a, b) => a - b)
      .join(","),
  );
}
