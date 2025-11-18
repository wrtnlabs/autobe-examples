import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user search with different sorting options.
 *
 * Validates that sorting works correctly for email and created_at fields,
 * testing both ascending and descending sort directions to ensure proper
 * ordering of user accounts in search results.
 */
export async function test_api_user_search_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create test users with predictable data for sorting validation
  const testUsers = await ArrayUtil.asyncRepeat(5, async (index) => {
    const email = `testuser${index}@example.com`;
    const user = await api.functional.auth.user.join(connection, {
      body: {
        email: email,
        password: "testpassword123",
        name: `Test User ${index}`,
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies ITodoAppUser.ICreate,
    });
    typia.assert(user);
    return user;
  });

  // Step 2: Test default sorting (should be email ascending)
  const defaultResults = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(defaultResults);

  // Validate default sorting uses email field
  TestValidator.predicate("default sort uses email field", () => {
    const filteredResults = defaultResults.data.filter((user) =>
      testUsers.some((testUser) => testUser.id === user.id),
    );

    if (filteredResults.length < 2) return true; // Not enough data to validate

    // Check if results appear to be sorted by email (first user should have earlier email)
    return (
      filteredResults[0].email <=
      filteredResults[filteredResults.length - 1].email
    );
  });

  // Step 3: Test email ascending sort with explicit parameters
  const emailAscResults = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order_by: "email",
        order_direction: "asc",
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(emailAscResults);

  TestValidator.predicate("email ascending sort should be correct", () => {
    const filteredResults = emailAscResults.data.filter((user) =>
      testUsers.some((testUser) => testUser.id === user.id),
    );

    for (let i = 0; i < filteredResults.length - 1; i++) {
      if (filteredResults[i].email > filteredResults[i + 1].email) {
        return false;
      }
    }
    return true;
  });

  // Step 4: Test email descending sort
  const emailDescResults = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order_by: "email",
        order_direction: "desc",
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(emailDescResults);

  TestValidator.predicate("email descending sort should be correct", () => {
    const filteredResults = emailDescResults.data.filter((user) =>
      testUsers.some((testUser) => testUser.id === user.id),
    );

    for (let i = 0; i < filteredResults.length - 1; i++) {
      if (filteredResults[i].email < filteredResults[i + 1].email) {
        return false;
      }
    }
    return true;
  });

  // Step 5: Test created_at ascending sort
  const createdAscResults = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(createdAscResults);

  TestValidator.predicate("created_at ascending sort should be correct", () => {
    const filteredResults = createdAscResults.data.filter((user) =>
      testUsers.some((testUser) => testUser.id === user.id),
    );

    for (let i = 0; i < filteredResults.length - 1; i++) {
      const currentDate = new Date(filteredResults[i].created_at).getTime();
      const nextDate = new Date(filteredResults[i + 1].created_at).getTime();
      if (currentDate > nextDate) {
        return false;
      }
    }
    return true;
  });

  // Step 6: Test created_at descending sort
  const createdDescResults = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(createdDescResults);

  TestValidator.predicate(
    "created_at descending sort should be correct",
    () => {
      const filteredResults = createdDescResults.data.filter((user) =>
        testUsers.some((testUser) => testUser.id === user.id),
      );

      for (let i = 0; i < filteredResults.length - 1; i++) {
        const currentDate = new Date(filteredResults[i].created_at).getTime();
        const nextDate = new Date(filteredResults[i + 1].created_at).getTime();
        if (currentDate < nextDate) {
          return false;
        }
      }
      return true;
    },
  );

  // Step 7: Test pagination with sorting
  const paginatedResults = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 3,
        order_by: "email",
        order_direction: "asc",
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(paginatedResults);

  TestValidator.equals(
    "pagination with sorting should respect limit",
    paginatedResults.data.length,
    3,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    paginatedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    paginatedResults.pagination.limit,
    3,
  );
}
