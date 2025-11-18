import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppCategory";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_category_search_empty_results(
  connection: api.IConnection,
) {
  // 1. Create user account for authentication using proper template imports
  const userEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: userEmail,
    password: "TestPass123",
    ip: "127.0.0.1",
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000/",
  } satisfies ITodoAppUser.IJoin;

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(user);

  // 2. Create baseline categories for testing with controlled data
  const categories = ArrayUtil.repeat(
    5,
    (index) =>
      ({
        name: RandomGenerator.name(2), // 2-word description
        description: RandomGenerator.paragraph({ sentences: 3 }),
      }) satisfies ITodoAppCategory.ICreate,
  );

  const createdCategories: ITodoAppCategory[] = [];
  for (const category of categories) {
    const created = await api.functional.todoApp.user.categories.create(
      connection,
      { body: category },
    );
    createdCategories.push(created);
  }

  // 3. Test search with non-matching query
  const nonMatchingResult = await api.functional.todoApp.user.categories.index(
    connection,
    {
      body: {
        search: "NonExistentCategoryString12345",
      } satisfies ITodoAppCategory.IRequest,
    },
  );
  typia.assert(nonMatchingResult);

  TestValidator.equals(
    "non-matching search returns empty data",
    nonMatchingResult.data,
    [],
  );
  TestValidator.equals(
    "pagination shows zero results",
    nonMatchingResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination shows zero pages",
    nonMatchingResult.pagination.pages,
    0,
  );

  // 4. Test with partial match that doesn't exist using realistic non-match
  const partialMatchResult = await api.functional.todoApp.user.categories.index(
    connection,
    {
      body: {
        search: "QuantumPhysicsNeuralNetworks",
      } satisfies ITodoAppCategory.IRequest,
    },
  );
  typia.assert(partialMatchResult);

  TestValidator.equals(
    "partial non-matching search returns empty",
    partialMatchResult.data,
    [],
  );
  TestValidator.predicate(
    "pagination records is zero with partial match",
    partialMatchResult.pagination.records === 0,
  );
  TestValidator.equals(
    "pagination shows zero pages with partial match",
    partialMatchResult.pagination.pages,
    0,
  );

  // 5. Test search with special characters
  const specialCharResult = await api.functional.todoApp.user.categories.index(
    connection,
    {
      body: {
        search: "##@#$%^&*()",
      } satisfies ITodoAppCategory.IRequest,
    },
  );
  typia.assert(specialCharResult);

  TestValidator.equals(
    "special character search returns empty",
    specialCharResult.data,
    [],
  );
  TestValidator.predicate(
    "special char pagination shows zero",
    specialCharResult.pagination.records === 0,
  );
  TestValidator.equals(
    "special char pagination shows zero pages",
    specialCharResult.pagination.pages,
    0,
  );

  // 6. Test with random alphanumeric string
  const randomSearchResult = await api.functional.todoApp.user.categories.index(
    connection,
    {
      body: {
        search: RandomGenerator.alphaNumeric(15),
      } satisfies ITodoAppCategory.IRequest,
    },
  );
  typia.assert(randomSearchResult);

  TestValidator.equals(
    "random search returns empty",
    randomSearchResult.data,
    [],
  );
  TestValidator.equals(
    "random search pagination shows zero pages",
    randomSearchResult.pagination.pages,
    0,
  );

  // 7. Test with very long search query
  const longQueryResult = await api.functional.todoApp.user.categories.index(
    connection,
    {
      body: {
        search: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
      } satisfies ITodoAppCategory.IRequest,
    },
  );
  typia.assert(longQueryResult);

  TestValidator.equals(
    "long query search returns empty",
    longQueryResult.data,
    [],
  );
  TestValidator.equals(
    "long query pagination shows zero pages",
    longQueryResult.pagination.pages,
    0,
  );

  // 8. Test pagination parameters with non-matching results
  const paginatedResult = await api.functional.todoApp.user.categories.index(
    connection,
    {
      body: {
        search: RandomGenerator.alphaNumeric(10),
        page: 1,
        limit: 10,
      } satisfies ITodoAppCategory.IRequest,
    },
  );
  typia.assert(paginatedResult);

  TestValidator.equals(
    "paginated non-matching search empty",
    paginatedResult.data,
    [],
  );
  TestValidator.equals(
    "pagination shows correct page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination shows correct limit",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination shows zero for paginated non-match",
    paginatedResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination shows zero pages for paginated non-match",
    paginatedResult.pagination.pages,
    0,
  );

  // 9. Test edge case: empty search string
  const emptySearchResult = await api.functional.todoApp.user.categories.index(
    connection,
    {
      body: {
        search: "",
      } satisfies ITodoAppCategory.IRequest,
    },
  );
  typia.assert(emptySearchResult);

  TestValidator.predicate(
    "empty search should return categories",
    emptySearchResult.data.length > 0,
  );
  TestValidator.predicate(
    "empty search pagination shows actual count",
    emptySearchResult.pagination.records === 5,
  );
}
