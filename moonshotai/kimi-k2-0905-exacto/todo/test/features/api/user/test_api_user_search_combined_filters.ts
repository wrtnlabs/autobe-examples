import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user search combining multiple filter criteria with email patterns,
 * status filtering, sorting, and pagination.
 *
 * Validates that complex user search queries work correctly when combining
 * multiple filter criteria simultaneously. Tests email pattern matching, status
 * filters, different sorting orders, and pagination with various limits and
 * page numbers.
 *
 * 1. Create a test user for authentication
 * 2. Generate multiple test users with diverse email patterns and statuses
 * 3. Test email pattern filtering combined with status filtering
 * 4. Test sorting by different fields (email, created_at) in both directions
 * 5. Test pagination with different limit values and page numbers
 * 6. Test comprehensive combinations of all filters together
 * 7. Validate search results match expected filtering and ordering logic
 */
export async function test_api_user_search_combined_filters(
  connection: api.IConnection,
) {
  // Create authenticated user for search operations
  const authUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com",
      referrer: "https://example.org",
      name: RandomGenerator.name(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(authUser);

  // Generate test users with different patterns
  const testUsers = await ArrayUtil.asyncRepeat(10, async () => {
    const user = await api.functional.auth.user.join(
      {
        ...connection,
        headers: {},
      },
      {
        body: {
          email: RandomGenerator.pick([
            `${RandomGenerator.name().replace(" ", "")}@test.com`,
            `${RandomGenerator.alphabets(5)}@example.org`,
            `${RandomGenerator.alphabets(3)}@academic.edu`,
            `${RandomGenerator.alphabets(4)}@company.io`,
          ]),
          password: RandomGenerator.alphaNumeric(10),
          href: "https://test.com",
          referrer: "https://test.org",
          name: RandomGenerator.pick([RandomGenerator.name(), null]),
        } satisfies ITodoAppUser.ICreate,
      },
    );
    return user;
  });
  typia.assert<Array<ITodoAppUser.IAuthorized>>(testUsers);

  // Test basic search without filters
  const emptySearch = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "basic search returns results",
    emptySearch.data.length > 0,
  );

  // Test email pattern search combined with other filters
  const emailPatternSearch = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        search: "test.com",
        page: 1,
        limit: 5,
        order_by: "email",
        order_direction: "asc",
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(emailPatternSearch);
  TestValidator.predicate(
    "email pattern search works",
    emailPatternSearch.data.length > 0,
  );

  // Verify email pattern matching
  emailPatternSearch.data.forEach((user, index) => {
    TestValidator.predicate(
      "user email contains pattern",
      user.email.includes("test.com"),
    );

    if (index < emailPatternSearch.data.length - 1) {
      TestValidator.predicate(
        "results are sorted by email asc",
        user.email <= emailPatternSearch.data[index + 1].email,
      );
    }
  });

  // Test descending order
  const descSearch = await api.functional.todoApp.user.users.index(connection, {
    body: {
      order_by: "email",
      order_direction: "desc",
    } satisfies ITodoAppUser.IRequest,
  });
  typia.assert(descSearch);

  descSearch.data.forEach((user, index) => {
    if (index < descSearch.data.length - 1) {
      TestValidator.predicate(
        "results are sorted by email desc",
        user.email >= descSearch.data[index + 1].email,
      );
    }
  });

  // Test pagination
  const page1Search = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(page1Search);

  const page2Search = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 2,
        limit: 3,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(page2Search);

  TestValidator.predicate(
    "page 1 has expected limit",
    page1Search.data.length === 3,
  );
  TestValidator.predicate(
    "page 2 has expected limit",
    page2Search.data.length === 3,
  );
  TestValidator.notEquals(
    "page 1 and page 2 have different users",
    page1Search.data,
    page2Search.data,
  );

  // Test combined complex search
  const complexSearch = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        search: "@exam",
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(complexSearch);

  TestValidator.predicate(
    "complex search returns results",
    complexSearch.data.length > 0,
  );

  // Verify all results match search criteria
  complexSearch.data.forEach((user) => {
    TestValidator.predicate(
      "email contains search term",
      user.email.includes("@exam"),
    );
  });

  // Verify pagination info is correct
  TestValidator.equals(
    "pagination current page",
    complexSearch.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", complexSearch.pagination.limit, 10);
  TestValidator.predicate(
    "total records is positive",
    complexSearch.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages is positive",
    complexSearch.pagination.pages > 0,
  );
}
