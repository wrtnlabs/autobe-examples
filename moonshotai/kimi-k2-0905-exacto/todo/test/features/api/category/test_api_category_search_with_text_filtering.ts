import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppCategory";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test advanced text search functionality in category filtering. Validates
 * partial matching capabilities across category names and descriptions,
 * case-insensitive search behavior, and special character handling in search
 * queries. Tests that search results correctly filter categories based on text
 * content while maintaining pagination integrity.
 *
 * This test creates a comprehensive scenario to validate the category search
 * functionality:
 *
 * 1. Creates an authenticated user account
 * 2. Creates multiple categories with varied names and descriptions
 * 3. Tests search functionality with partial matches
 * 4. Tests case-insensitive search behavior
 * 5. Tests special character handling
 * 6. Validates pagination with search results
 * 7. Tests exact matching vs partial matching
 */
export async function test_api_category_search_with_text_filtering(
  connection: api.IConnection,
) {
  // 1. Create authenticated user account
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);

  // 2. Create multiple categories with varied names and descriptions
  const categories: ITodoAppCategory[] = [];

  // Create categories with simple names and descriptions
  for (let i = 0; i < 5; i++) {
    const shortName = RandomGenerator.alphabets(5);
    const categoryData = {
      name: `${shortName}${i}`,
      description: `Simple description: ${RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 8 })}`,
    } satisfies ITodoAppCategory.ICreate;

    const category = await api.functional.todoApp.user.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
    typia.assert(category);
    categories.push(category);
  }

  // Create categories with longer names and complex descriptions
  for (let i = 5; i < 10; i++) {
    const complexName = RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 5,
    });
    const categoryData = {
      name: `${complexName}-${i}`,
      description: `Complex description: ${RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 })} with special characters: !@#$%^&*()`,
    } satisfies ITodoAppCategory.ICreate;

    const category = await api.functional.todoApp.user.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
    typia.assert(category);
    categories.push(category);
  }

  // 3. Test search functionality with partial matches
  const partialSearchTerm = categories[0].name.substring(0, 3);
  const partialMatchQuery = {
    search: partialSearchTerm,
    page: 1,
    limit: 5,
  } satisfies ITodoAppCategory.IRequest;

  const partialMatchResponse =
    await api.functional.todoApp.user.categories.index(connection, {
      body: partialMatchQuery,
    });
  typia.assert(partialMatchResponse);

  TestValidator.predicate(
    "partial match returns results for category index",
    () => partialMatchResponse.data.length > 0,
  );
  TestValidator.predicate(
    "partial match results contain search term for category index",
    () =>
      partialMatchResponse.data.some(
        (cat) =>
          cat.name
            .toLowerCase()
            .includes(partialMatchQuery.search.toLowerCase()) ||
          (cat.description &&
            cat.description
              .toLowerCase()
              .includes(partialMatchQuery.search.toLowerCase())),
      ),
  );

  // 4. Test case-insensitive search behavior
  const uppercaseSearch = categories[1].name.toUpperCase();
  const caseInsensitiveQuery = {
    search: uppercaseSearch,
    page: 1,
    limit: 5,
  } satisfies ITodoAppCategory.IRequest;

  const caseInsensitiveResponse =
    await api.functional.todoApp.user.categories.index(connection, {
      body: caseInsensitiveQuery,
    });
  typia.assert(caseInsensitiveResponse);

  TestValidator.predicate(
    "case-insensitive search returns results for category index",
    () => caseInsensitiveResponse.data.length > 0,
  );
  TestValidator.predicate(
    "case-insensitive search finds original category with index",
    () =>
      caseInsensitiveResponse.data.some(
        (cat) => cat.name.toLowerCase() === uppercaseSearch.toLowerCase(),
      ),
  );

  // 5. Test special character handling
  const specialCharQuery = {
    search: "!@#$%^&*()",
    page: 1,
    limit: 5,
  } satisfies ITodoAppCategory.IRequest;

  const specialCharResponse =
    await api.functional.todoApp.user.categories.index(connection, {
      body: specialCharQuery,
    });
  typia.assert(specialCharResponse);

  TestValidator.predicate(
    "special character search handles symbols correctly",
    () => {
      return specialCharResponse.data.every((cat) => {
        const searchTerm = specialCharQuery.search.toLowerCase();
        return (
          cat.name.toLowerCase().includes(searchTerm) ||
          (cat.description &&
            cat.description.toLowerCase().includes(searchTerm))
        );
      });
    },
  );

  // 6. Test pagination with search results
  const paginationQuery = {
    search: RandomGenerator.alphabets(3),
    page: 1,
    limit: 3,
  } satisfies ITodoAppCategory.IRequest;

  const paginationResponse = await api.functional.todoApp.user.categories.index(
    connection,
    {
      body: paginationQuery,
    },
  );
  typia.assert(paginationResponse);

  TestValidator.equals(
    "pagination response has correct limit for category index",
    paginationResponse.pagination.limit,
    paginationQuery.limit!,
  );
  TestValidator.equals(
    "pagination response has correct current page for category index",
    paginationResponse.pagination.current,
    paginationQuery.page!,
  );
  TestValidator.predicate(
    "pagination response data does not exceed limit for category index",
    () => paginationResponse.data.length <= paginationQuery.limit!,
  );

  // 7. Test exact matching vs partial matching
  const exactMatchQuery = {
    search: categories[2].name,
    page: 1,
    limit: 10,
  } satisfies ITodoAppCategory.IRequest;

  const exactMatchResponse = await api.functional.todoApp.user.categories.index(
    connection,
    {
      body: exactMatchQuery,
    },
  );
  typia.assert(exactMatchResponse);

  TestValidator.predicate(
    "exact match query finds exact category with index",
    () =>
      exactMatchResponse.data.some(
        (cat) => cat.name === exactMatchQuery.search,
      ),
  );

  // 8. Test empty search (should return all categories)
  const emptySearchQuery = {
    search: "",
    page: 1,
    limit: 20,
  } satisfies ITodoAppCategory.IRequest;

  const emptySearchResponse =
    await api.functional.todoApp.user.categories.index(connection, {
      body: emptySearchQuery,
    });
  typia.assert(emptySearchResponse);

  TestValidator.predicate(
    "empty search returns all categories for index",
    () =>
      emptySearchResponse.data.length > 0 &&
      emptySearchResponse.data.length <= categories.length,
  );
}
