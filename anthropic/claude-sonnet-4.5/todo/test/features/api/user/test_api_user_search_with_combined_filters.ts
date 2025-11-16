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
 * Test complex user search queries with multiple combined filter parameters.
 *
 * This test validates that administrators can perform sophisticated user
 * searches by combining multiple filter criteria simultaneously. It creates a
 * diverse set of test users and then tests various combinations of filters to
 * ensure they work together correctly with AND logic.
 *
 * Test workflow:
 *
 * 1. Authenticate as administrator
 * 2. Create diverse set of test users with various attributes
 * 3. Test search term combined with email verification filter
 * 4. Test date ranges combined with sorting parameters
 * 5. Test pagination combined with multiple filters
 * 6. Test all parameters together in a single complex query
 * 7. Validate that filters progressively narrow results correctly
 * 8. Verify pagination metadata reflects filtered result counts accurately
 */
export async function test_api_user_search_with_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create diverse set of test users for comprehensive filtering tests
  const testUsers: ITodoListUser.IAuthorized[] = [];

  // Create users with specific email patterns for search testing
  const emailDomains = ["testdomain.com", "example.org", "sample.net"] as const;

  for (let i = 0; i < 15; i++) {
    const domain = RandomGenerator.pick(emailDomains);
    const user = await api.functional.auth.user.join(connection, {
      body: {
        email: `testuser${i}@${domain}`,
        password: "password123",
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
    typia.assert(user);
    testUsers.push(user);
  }

  // Re-authenticate as admin for searching (using original password)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: admin.email,
      password: adminPassword,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });

  // Step 3: Test search term combined with email verification filter
  const searchWithVerificationResult =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        search: "testuser",
        email_verified: false,
        page: 1,
        limit: 20,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(searchWithVerificationResult);

  TestValidator.predicate(
    "search with verification filter returns paginated results",
    searchWithVerificationResult.pagination.records >= 0,
  );

  // Validate all returned users match the filters
  for (const user of searchWithVerificationResult.data) {
    TestValidator.predicate(
      "user email contains search term",
      user.email.includes("testuser"),
    );
    TestValidator.equals(
      "user email verification status matches filter",
      user.email_verified,
      false,
    );
  }

  // Step 4: Test date ranges combined with sorting
  const currentDate = new Date();
  const pastDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeWithSortingResult =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        created_after: pastDate.toISOString(),
        created_before: currentDate.toISOString(),
        order_by: "created_at",
        order_direction: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(dateRangeWithSortingResult);

  TestValidator.predicate(
    "date range filter returns results",
    dateRangeWithSortingResult.pagination.records >= 0,
  );

  // Validate sorting order (descending by created_at)
  for (let i = 0; i < dateRangeWithSortingResult.data.length - 1; i++) {
    const currentUserDate = new Date(
      dateRangeWithSortingResult.data[i].created_at,
    );
    const nextUserDate = new Date(
      dateRangeWithSortingResult.data[i + 1].created_at,
    );
    TestValidator.predicate(
      "users sorted in descending order by created_at",
      currentUserDate >= nextUserDate,
    );
  }

  // Step 5: Test pagination with multiple filters
  const paginatedFilterResult = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: {
        email: "testdomain.com",
        email_verified: false,
        page: 1,
        limit: 5,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(paginatedFilterResult);

  TestValidator.predicate(
    "pagination limit respected",
    paginatedFilterResult.data.length <= 5,
  );

  TestValidator.equals(
    "pagination current page matches request",
    paginatedFilterResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit matches request",
    paginatedFilterResult.pagination.limit,
    5,
  );

  // Step 6: Test all parameters together in complex query
  const complexQueryResult = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: {
        search: "testuser",
        email: "testdomain.com",
        email_verified: false,
        created_after: pastDate.toISOString(),
        created_before: currentDate.toISOString(),
        order_by: "email",
        order_direction: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(complexQueryResult);

  // Step 7: Validate that filters progressively narrow results (AND logic)
  const allUsersResult = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(allUsersResult);

  const searchOnlyResult = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: {
        search: "testuser",
        page: 1,
        limit: 100,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(searchOnlyResult);

  TestValidator.predicate(
    "adding filters narrows results",
    complexQueryResult.pagination.records <=
      searchOnlyResult.pagination.records,
  );

  TestValidator.predicate(
    "search filter narrows from all users",
    searchOnlyResult.pagination.records <= allUsersResult.pagination.records,
  );

  // Step 8: Verify pagination metadata accuracy
  TestValidator.predicate(
    "pagination pages calculated correctly",
    complexQueryResult.pagination.pages ===
      Math.ceil(
        complexQueryResult.pagination.records /
          complexQueryResult.pagination.limit,
      ),
  );

  // Validate complex query results match all filter criteria
  for (const user of complexQueryResult.data) {
    TestValidator.predicate(
      "user matches search term filter",
      user.email.includes("testuser"),
    );

    TestValidator.predicate(
      "user matches email domain filter",
      user.email.includes("testdomain.com"),
    );

    TestValidator.equals(
      "user matches email verification filter",
      user.email_verified,
      false,
    );

    const userCreatedDate = new Date(user.created_at);
    TestValidator.predicate(
      "user created after minimum date",
      userCreatedDate >= pastDate,
    );

    TestValidator.predicate(
      "user created before maximum date",
      userCreatedDate <= currentDate,
    );
  }

  // Validate email sorting (ascending)
  for (let i = 0; i < complexQueryResult.data.length - 1; i++) {
    TestValidator.predicate(
      "users sorted alphabetically by email",
      complexQueryResult.data[i].email <= complexQueryResult.data[i + 1].email,
    );
  }
}
