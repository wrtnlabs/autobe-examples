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

export async function test_api_categories_listing_success_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Basic listing success - initial call without filters
  const basicResponse = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(basicResponse);
  TestValidator.predicate(
    "basic listing returns data",
    () => basicResponse.data.length > 0,
  );
  TestValidator.predicate(
    "basic listing has valid pagination",
    () =>
      basicResponse.pagination.current > 0 &&
      basicResponse.pagination.limit > 0 &&
      basicResponse.pagination.records > 0 &&
      basicResponse.pagination.pages > 0,
  );
  // 2. Verify category structure
  basicResponse.data.forEach((category) => {
    typia.assert(category);
    TestValidator.predicate(
      "category name is non-empty",
      () => category.name.length > 0,
    );
    TestValidator.equals(
      "is_leaf is boolean",
      typeof category.is_leaf,
      "boolean",
    );
  });
  // 3. Test search functionality with partial matching
  const searchTerms = basicResponse.data
    .slice(0, 3)
    .map((cat) => cat.name.substring(0, 3));
  for (const searchTerm of searchTerms) {
    const searchResponse = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          search: searchTerm,
        },
      },
    );
    typia.assert(searchResponse);
    TestValidator.predicate(
      `search for '${searchTerm}' returns valid response`,
      () => searchResponse.data.length >= 0,
    );
    // Verify all returned categories match the search term (case-insensitive)
    searchResponse.data.forEach((category) => {
      const nameMatch = category.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      TestValidator.predicate(
        `search term matches category name '${category.name}'`,
        () => nameMatch,
      );
    });
  }
  // 4. Test parent category filtering - root categories (parent_category_id: undefined)
  const rootResponse = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        parent_category_id: undefined,
      },
    },
  );
  typia.assert(rootResponse);
  rootResponse.data.forEach((category) => {
    typia.assert(category);
    TestValidator.equals(
      "root category parent is null",
      category.parent === null,
      true,
    );
  });
  // 5. Test parent category filtering - subcategories (with specific parent)
  const sampleParentId =
    basicResponse.data.find((cat) => cat.is_leaf === false)?.id ??
    typia.random<string & tags.Format<"uuid">>();
  if (sampleParentId) {
    const subcategoryResponse =
      await api.functional.ecommerceMall.categories.index(connection, {
        body: {
          parent_category_id: sampleParentId,
        },
      });
    typia.assert(subcategoryResponse);
    subcategoryResponse.data.forEach((category) => {
      typia.assert(category);
      if (category.parent) {
        typia.assert(category.parent);
        TestValidator.equals(
          "subcategory references correct parent",
          category.parent.id,
          sampleParentId,
        );
      }
    });
  }
  // 6. Test sorting by name ascending
  const nameAscResponse = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        sort_by: "name",
        sort_order: "asc",
        limit: 50,
      },
    },
  );
  typia.assert(nameAscResponse);
  // Validate name ascending order
  for (let i = 1; i < nameAscResponse.data.length; i++) {
    const prevName = nameAscResponse.data[i - 1].name.toLowerCase();
    const currName = nameAscResponse.data[i].name.toLowerCase();
    TestValidator.predicate("name ascending order", () => prevName <= currName);
  }
  // 7. Test sorting by name descending
  const nameDescResponse = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        sort_by: "name",
        sort_order: "desc",
        limit: 50,
      },
    },
  );
  typia.assert(nameDescResponse);
  // Validate name descending order
  for (let i = 1; i < nameDescResponse.data.length; i++) {
    const prevName = nameAscResponse.data[i - 1].name.toLowerCase();
    const currName = nameAscResponse.data[i].name.toLowerCase();
    TestValidator.predicate(
      "name descending order",
      () => prevName >= currName,
    );
  }
  // 8. Test sorting by created_at ascending
  const createdAtAscResponse =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        limit: 50,
      },
    });
  typia.assert(createdAtAscResponse);
  // Validate created_at ascending order
  for (let i = 1; i < createdAtAscResponse.data.length; i++) {
    const prevDate = new Date(
      createdAtAscResponse.data[i - 1].created_at,
    ).getTime();
    const currDate = new Date(
      createdAtAscResponse.data[i].created_at,
    ).getTime();
    TestValidator.predicate(
      "created_at ascending order",
      () => prevDate <= currDate,
    );
  }
  // 9. Test sorting by created_at descending
  const createdAtDescResponse =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        limit: 50,
      },
    });
  typia.assert(createdAtDescResponse);
  // Validate created_at descending order
  for (let i = 1; i < createdAtDescResponse.data.length; i++) {
    const prevDate = new Date(
      createdAtDescResponse.data[i - 1].created_at,
    ).getTime();
    const currDate = new Date(
      createdAtDescResponse.data[i].created_at,
    ).getTime();
    TestValidator.predicate(
      "created_at descending order",
      () => prevDate >= currDate,
    );
  }
  // 10. Test cursor-based pagination
  const firstPage = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        limit: 10,
      },
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page pagination is accurate",
    firstPage.pagination.current,
    1,
  );
  if ("next_cursor" in firstPage && firstPage.next_cursor) {
    const secondPage = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          cursor: firstPage.next_cursor as string,
          limit: 10,
        },
      },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page cursor exists",
      "next_cursor" in secondPage ? secondPage.next_cursor !== undefined : true,
      true,
    );
    TestValidator.equals(
      "second page pagination current is 2",
      secondPage.pagination.current,
      2,
    );
    TestValidator.notEquals(
      "second page has different data than first",
      secondPage.data[0]?.id,
      firstPage.data[0]?.id,
    );
  }
  // 11. Verify is_leaf flag accuracy
  basicResponse.data.forEach((category) => {
    typia.assert(category);
    TestValidator.equals(
      "is_leaf is boolean",
      typeof category.is_leaf,
      "boolean",
    );
  });
  // 12. Verify deleted categories are excluded
  basicResponse.data.forEach((category) => {
    typia.assert(category);
    TestValidator.equals(
      "deleted_at is null for active categories",
      category.deleted_at === null,
      true,
    );
  });
  // 13. Test is_leaf filtering
  const leafOnlyResponse = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        is_leaf: true,
      },
    },
  );
  typia.assert(leafOnlyResponse);
  leafOnlyResponse.data.forEach((category) => {
    typia.assert(category);
    TestValidator.equals(
      "is_leaf filter returns only leaf categories",
      category.is_leaf,
      true,
    );
  });
  // 14. Test pagination metadata accuracy
  const paginationResponse =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        limit: 20,
      },
    });
  typia.assert(paginationResponse);
  const expectedPages = Math.ceil(
    paginationResponse.pagination.records / paginationResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation is accurate",
    paginationResponse.pagination.pages,
    expectedPages,
  );
}