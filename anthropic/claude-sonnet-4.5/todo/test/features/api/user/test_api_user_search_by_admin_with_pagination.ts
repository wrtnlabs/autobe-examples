import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test administrator's ability to search and retrieve paginated user lists with
 * various filtering criteria.
 *
 * This comprehensive test validates the core user management functionality
 * where administrators need to browse, search, and manage registered user
 * accounts. The test verifies:
 *
 * 1. Basic pagination with different page sizes and page numbers
 * 2. Search functionality across email fields with partial matching
 * 3. Filtering by email verification status (verified/unverified/all)
 * 4. Date range filtering for user registration dates
 * 5. Sorting capabilities by created_at and email fields
 * 6. Pagination metadata accuracy (current page, total records, total pages)
 * 7. Response data structure matches ITodoListUser.ISummary
 * 8. Edge cases: empty results, maximum limits, boundary conditions
 *
 * The test creates multiple users with varying characteristics to validate
 * filtering and search operations work correctly across different data
 * scenarios.
 */
export async function test_api_user_search_by_admin_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create multiple test users with varying characteristics
  const testUsers: ITodoListUser.IAuthorized[] = [];
  const userCount = 6;

  for (let i = 0; i < userCount; i++) {
    const userEmail = `testuser${i}_${RandomGenerator.alphaNumeric(8)}@example.com`;
    const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
      connection,
      {
        body: {
          email: userEmail,
          password: "password123",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoListUser.ICreate,
      },
    );
    typia.assert(user);
    testUsers.push(user);
  }

  // Step 3: Test basic pagination - first page
  const firstPage: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(firstPage);

  // Validate pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "first page has records",
    firstPage.pagination.records >= userCount,
  );
  TestValidator.predicate(
    "first page has pages",
    firstPage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "first page data length",
    firstPage.data.length > 0 && firstPage.data.length <= 10,
  );

  // Step 4: Test second page pagination
  if (firstPage.pagination.pages > 1) {
    const secondPage: IPageITodoListUser.ISummary =
      await api.functional.todoList.admin.users.index(connection, {
        body: {
          page: 2,
          limit: 10,
        } satisfies ITodoListUser.IRequest,
      });
    typia.assert(secondPage);

    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page records match",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
  }

  // Step 5: Test with different page limit
  const smallLimit: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(smallLimit);

  TestValidator.equals("small limit page size", smallLimit.pagination.limit, 5);
  TestValidator.predicate(
    "small limit data length",
    smallLimit.data.length > 0 && smallLimit.data.length <= 5,
  );

  // Step 6: Test email search with partial matching
  const searchEmail = testUsers[0].email.substring(0, 10);
  const searchResults: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        search: searchEmail,
        page: 1,
        limit: 20,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(searchResults);

  TestValidator.predicate(
    "search returns results",
    searchResults.data.length > 0,
  );
  TestValidator.predicate(
    "search results match query",
    searchResults.data.every((u) => u.email.includes(searchEmail)),
  );

  // Step 7: Test filtering by email field
  const emailFilter: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        email: testUsers[0].email,
        page: 1,
        limit: 20,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(emailFilter);

  // Step 8: Test filtering by email_verified status
  const verifiedFilter: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        email_verified: false,
        page: 1,
        limit: 20,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(verifiedFilter);

  TestValidator.predicate(
    "verified filter matches status",
    verifiedFilter.data.every((u) => u.email_verified === false),
  );

  // Step 9: Test date range filtering - created_after
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const afterFilter: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        created_after: oneDayAgo.toISOString(),
        page: 1,
        limit: 20,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(afterFilter);

  TestValidator.predicate(
    "created_after returns recent users",
    afterFilter.data.length > 0,
  );
  if (afterFilter.data.length > 0) {
    TestValidator.predicate(
      "created_after date range valid",
      afterFilter.data.every(
        (u) => new Date(u.created_at).getTime() >= oneDayAgo.getTime(),
      ),
    );
  }

  // Step 10: Test date range filtering - created_before
  const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const beforeFilter: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        created_before: futureDate.toISOString(),
        page: 1,
        limit: 20,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(beforeFilter);

  TestValidator.predicate(
    "created_before returns users",
    beforeFilter.data.length > 0,
  );
  if (beforeFilter.data.length > 0) {
    TestValidator.predicate(
      "created_before date range valid",
      beforeFilter.data.every(
        (u) => new Date(u.created_at).getTime() <= futureDate.getTime(),
      ),
    );
  }

  // Step 11: Test combined date range filtering
  const rangeFilter: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        created_after: oneDayAgo.toISOString(),
        created_before: futureDate.toISOString(),
        page: 1,
        limit: 20,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(rangeFilter);

  if (rangeFilter.data.length > 0) {
    TestValidator.predicate(
      "combined date range valid",
      rangeFilter.data.every((u) => {
        const createdTime = new Date(u.created_at).getTime();
        return (
          createdTime >= oneDayAgo.getTime() &&
          createdTime <= futureDate.getTime()
        );
      }),
    );
  }

  // Step 12: Test sorting by created_at ascending
  const sortByDateAsc: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        page: 1,
        limit: 20,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(sortByDateAsc);

  if (sortByDateAsc.data.length >= 2) {
    TestValidator.predicate(
      "sorted by created_at asc",
      new Date(sortByDateAsc.data[0].created_at).getTime() <=
        new Date(sortByDateAsc.data[1].created_at).getTime(),
    );
  }

  // Step 13: Test sorting by created_at descending
  const sortByDateDesc: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        page: 1,
        limit: 20,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(sortByDateDesc);

  if (sortByDateDesc.data.length >= 2) {
    TestValidator.predicate(
      "sorted by created_at desc",
      new Date(sortByDateDesc.data[0].created_at).getTime() >=
        new Date(sortByDateDesc.data[1].created_at).getTime(),
    );
  }

  // Step 14: Test sorting by email ascending
  const sortByEmailAsc: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        page: 1,
        limit: 20,
        order_by: "email",
        order_direction: "asc",
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(sortByEmailAsc);

  if (sortByEmailAsc.data.length >= 2) {
    TestValidator.predicate(
      "sorted by email asc",
      sortByEmailAsc.data[0].email.localeCompare(
        sortByEmailAsc.data[1].email,
      ) <= 0,
    );
  }

  // Step 15: Test sorting by email descending
  const sortByEmailDesc: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        page: 1,
        limit: 20,
        order_by: "email",
        order_direction: "desc",
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(sortByEmailDesc);

  if (sortByEmailDesc.data.length >= 2) {
    TestValidator.predicate(
      "sorted by email desc",
      sortByEmailDesc.data[0].email.localeCompare(
        sortByEmailDesc.data[1].email,
      ) >= 0,
    );
  }

  // Step 16: Test maximum page limit boundary
  const maxLimit: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(maxLimit);

  TestValidator.equals("max limit applied", maxLimit.pagination.limit, 100);

  // Step 17: Test empty results scenario
  const emptySearch: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        search: `nonexistentuser_xyz_${RandomGenerator.alphaNumeric(20)}`,
        page: 1,
        limit: 20,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(emptySearch);

  TestValidator.equals("empty search results", emptySearch.data.length, 0);
  TestValidator.equals(
    "empty search records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals("empty search pages", emptySearch.pagination.pages, 0);

  // Step 18: Verify response structure contains all expected fields
  if (firstPage.data.length > 0) {
    const sampleUser = firstPage.data[0];
    TestValidator.predicate("user has id", typeof sampleUser.id === "string");
    TestValidator.predicate(
      "user has email",
      typeof sampleUser.email === "string",
    );
    TestValidator.predicate(
      "user has email_verified",
      typeof sampleUser.email_verified === "boolean",
    );
    TestValidator.predicate(
      "user has created_at",
      typeof sampleUser.created_at === "string",
    );
    TestValidator.predicate(
      "user has updated_at",
      typeof sampleUser.updated_at === "string",
    );
  }
}
