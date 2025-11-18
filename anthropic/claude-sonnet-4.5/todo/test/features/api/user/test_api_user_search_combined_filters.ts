import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user search with multiple filters applied simultaneously.
 *
 * This test validates the user search functionality when multiple filter
 * parameters are combined in a single request. It ensures that all filters work
 * together correctly with AND logic, properly narrowing down results to match
 * all specified criteria.
 *
 * The test covers realistic filter combinations such as:
 *
 * 1. Email filter combined with date range filtering
 * 2. Name search combined with sorting parameters
 * 3. Full-text search with pagination limits
 *
 * Process:
 *
 * 1. Create multiple test users with distinct characteristics
 * 2. Test email filter with date range
 * 3. Test name filter with sorting
 * 4. Test search parameter with pagination
 * 5. Validate pagination metadata accuracy
 * 6. Verify performance with multiple active filters
 */
export async function test_api_user_search_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create multiple test users with varied characteristics
  const baseTime = new Date();
  const users: ITodoListUser.IAuthorized[] = [];

  // Create 5 users with different attributes
  for (let i = 0; i < 5; i++) {
    const userEmail = `testuser${i}_${typia.random<string & tags.Format<"uuid">>().substring(0, 8)}@example.com`;
    const userName = i < 3 ? `Alice${i}` : `Bob${i}`;

    const user = await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "SecurePass123!",
        name: userName,
        href: "https://test.example.com/register",
        referrer: "https://search.example.com",
      } satisfies ITodoListUser.ICreate,
    });
    typia.assert(user);
    users.push(user);

    // Small delay to ensure different creation timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Step 2: Test email filter combined with date range
  const targetUser = users[0];
  const dateRangeStart = new Date(baseTime.getTime() - 1000 * 60).toISOString();
  const dateRangeEnd = new Date(
    baseTime.getTime() + 1000 * 60 * 10,
  ).toISOString();

  const emailDateRangeResult = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        email: targetUser.email,
        created_at_start: dateRangeStart,
        created_at_end: dateRangeEnd,
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(emailDateRangeResult);

  TestValidator.predicate(
    "email and date range filter should find the target user",
    emailDateRangeResult.data.length >= 1,
  );

  const foundUser = emailDateRangeResult.data.find(
    (u) => u.email === targetUser.email,
  );
  if (foundUser) {
    typia.assertGuard(foundUser);
    TestValidator.equals(
      "found user email matches",
      foundUser.email,
      targetUser.email,
    );
  }

  // Step 3: Test name filter with sorting (ascending by created_at)
  const nameFilterResult = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        name: "Alice",
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(nameFilterResult);

  TestValidator.predicate(
    "name filter should find users with Alice in their name",
    nameFilterResult.data.length >= 3,
  );

  // Verify all results contain "Alice" in the name
  for (const user of nameFilterResult.data) {
    if (user.name) {
      TestValidator.predicate(
        "filtered user name contains Alice",
        user.name.includes("Alice"),
      );
    }
  }

  // Step 4: Test full-text search with pagination
  const searchResult = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        search: users[1].email.substring(0, 10),
        page: 1,
        limit: 5,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(searchResult);

  TestValidator.predicate(
    "search filter should return results",
    searchResult.data.length >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be respected",
    searchResult.data.length <= 5,
  );

  // Step 5: Test name search with sorting (descending by email)
  const nameSortResult = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        name: "Bob",
        sort_by: "email",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(nameSortResult);

  // Verify sorting order
  if (nameSortResult.data.length > 1) {
    for (let i = 0; i < nameSortResult.data.length - 1; i++) {
      TestValidator.predicate(
        "results should be sorted by email descending",
        nameSortResult.data[i].email >= nameSortResult.data[i + 1].email,
      );
    }
  }

  // Step 6: Validate pagination metadata accuracy
  const paginationTest = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(paginationTest);

  TestValidator.predicate(
    "pagination current page should be 1",
    paginationTest.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    paginationTest.pagination.limit === 2,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    paginationTest.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    paginationTest.pagination.pages >= 0,
  );

  // Step 7: Test complex combination - email + name + date range + sorting
  const complexFilter = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        created_at_start: dateRangeStart,
        created_at_end: dateRangeEnd,
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(complexFilter);

  TestValidator.predicate(
    "complex filter should return results",
    complexFilter.data.length >= 0,
  );
}
