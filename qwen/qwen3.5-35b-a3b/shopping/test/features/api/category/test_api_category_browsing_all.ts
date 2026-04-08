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

export async function test_api_category_browsing_all(
  connection: api.IConnection,
): Promise<void> {
  // Test browsing categories with various parameters
  // The endpoint accepts unauthenticated access per authorization: null
  // 1. Access endpoint with default parameters (no filters, default pagination)
  const categoriesResponse =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {},
    });
  typia.assert(categoriesResponse);
  // 2. Validate pagination structure and metadata
  typia.assert(categoriesResponse.pagination);
  typia.assert(categoriesResponse.data);
  TestValidator.equals(
    "pagination current page is 1",
    categoriesResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination default limit is 20",
    categoriesResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    categoriesResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    categoriesResponse.pagination.pages >= 0,
  );
  // 3. Validate each category has correct ISummary structure
  categoriesResponse.data.forEach((category, index) => {
    typia.assert(category);
    TestValidator.predicate(
      `category ${index} name is not empty`,
      category.name.length >= 1,
    );
    TestValidator.predicate(
      `category ${index} name max length 100`,
      category.name.length <= 100,
    );
    TestValidator.predicate(
      `category ${index} description is string or null`,
      category.description === null || typeof category.description === "string",
    );
    TestValidator.predicate(
      `category ${index} sort_order range -999 to 999`,
      category.sort_order === null ||
        (category.sort_order >= -999 && category.sort_order <= 999),
    );
    TestValidator.equals(
      `category ${index} parent is null`,
      category.parent,
      null,
    );
    TestValidator.predicate(
      `category ${index} created_at is valid date-time`,
      !isNaN(Date.parse(category.created_at)),
    );
    TestValidator.predicate(
      `category ${index} updated_at is valid date-time`,
      !isNaN(Date.parse(category.updated_at)),
    );
  });
  // 4. Test pagination with different page and limit parameters
  const secondPageResponse =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        page: 2,
        limit: 5,
      },
    });
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "second page current is 2",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit is 5",
    secondPageResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "second page total records unchanged",
    secondPageResponse.pagination.records ===
      categoriesResponse.pagination.records,
  );
  // 5. Test category name filter
  if (categoriesResponse.data.length > 0) {
    const firstCategory = categoriesResponse.data[0];
    const filteredResponse =
      await api.functional.ecommerceMall.categories.index(connection, {
        body: {
          name: firstCategory.name.split(" ")[0],
        },
      });
    typia.assert(filteredResponse);
    TestValidator.predicate(
      "filtered results contain matching category",
      filteredResponse.data.some((cat) =>
        cat.name.includes(firstCategory.name.split(" ")[0]),
      ),
    );
  }
  // 6. Test parent_id filter for subcategories (NULL for top-level)
  const parentFilterResponse =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        parent_id: null,
      },
    });
  typia.assert(parentFilterResponse);
  // 7. Test sort_order filter
  const sortOrderFilterResponse =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        sort_order: null,
      },
    });
  typia.assert(sortOrderFilterResponse);
  // 8. Test sorting by created_at descending
  const sortCreatedAtDescResponse =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        sort: "created_at",
        order: "desc",
      },
    });
  typia.assert(sortCreatedAtDescResponse);
  if (sortCreatedAtDescResponse.data.length >= 2) {
    const dates = sortCreatedAtDescResponse.data.map((cat) => cat.created_at);
    for (let i = 1; i < dates.length; i++) {
      TestValidator.predicate(
        `category ${i} created_at is not after category ${i - 1}`,
        dates[i] <= dates[i - 1],
      );
    }
  }
  // 9. Test sorting by sort_order ascending
  const sortOrderAscResponse =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        sort: "sort_order",
        order: "asc",
      },
    });
  typia.assert(sortOrderAscResponse);
  // 10. Test sorting by name alphabetical
  const sortNameAscResponse =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        sort: "name",
        order: "asc",
      },
    });
  typia.assert(sortNameAscResponse);
}
