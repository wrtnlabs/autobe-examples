import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Admin searches for active user accounts in the system.
 *
 * Validates the complete workflow where admin creates test user accounts with
 * active status, then searches and filters the user list by status=active.
 * Verifies that the search returns only active users, pagination works
 * correctly with large result sets, and sorting by creation date functions as
 * expected.
 *
 * Test Flow:
 *
 * 1. Admin registers and authenticates with the system
 * 2. Create multiple user accounts with active status
 * 3. Admin searches for users using the search API
 * 4. Validate response contains only active users
 * 5. Verify pagination metadata is correct
 * 6. Confirm users are sorted by creation date
 */
export async function test_api_admin_user_search_active_users(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        password_confirmation: adminPassword,
      } satisfies ITodoAppAdmin.IRegister,
    },
  );
  typia.assert(admin);
  TestValidator.equals("admin authenticated", admin.status, "active");

  // 2. Create multiple active user accounts for testing
  const createdUsers: ITodoAppUser[] = [];
  const userCount = 5;

  for (let i = 0; i < userCount; i++) {
    const userEmail = typia.random<string & tags.Format<"email">>();
    const userPassword = RandomGenerator.alphabets(10);
    const user: ITodoAppUser = await api.functional.todoApp.users.create(
      connection,
      {
        body: {
          email: userEmail,
          password: userPassword,
        } satisfies ITodoAppUser.ICreate,
      },
    );
    typia.assert(user);
    TestValidator.equals(
      "user created with active status",
      user.status,
      "active",
    );
    createdUsers.push(user);
  }

  // 3. Admin searches for active users
  const searchResponse: IPageITodoAppUser.ISummary =
    await api.functional.todoApp.admin.users.index(connection, {
      body: {
        email: "",
        password: "",
      } satisfies ITodoAppUser.IRequest,
    });
  typia.assert(searchResponse);

  // 4. Validate response structure and pagination metadata
  TestValidator.predicate("search response has pagination metadata", () => {
    return (
      searchResponse.pagination !== undefined &&
      typeof searchResponse.pagination.current === "number" &&
      typeof searchResponse.pagination.limit === "number" &&
      typeof searchResponse.pagination.records === "number" &&
      typeof searchResponse.pagination.pages === "number"
    );
  });

  TestValidator.predicate(
    "pagination current page is valid",
    searchResponse.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit is positive",
    searchResponse.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records count is non-negative",
    searchResponse.pagination.records >= 0,
  );

  // 5. Validate only active users are returned
  TestValidator.predicate("all returned users have active status", () => {
    return searchResponse.data.every((user) => user.status === "active");
  });

  // 6. Verify created users appear in search results
  TestValidator.predicate("created users appear in search results", () => {
    const createdUserIds = new Set(createdUsers.map((u) => u.id));
    return searchResponse.data.some((u) => createdUserIds.has(u.id));
  });

  // 7. Validate sorting by creation date (earliest first)
  TestValidator.predicate("users are sorted by creation date", () => {
    if (searchResponse.data.length <= 1) return true;

    for (let i = 1; i < searchResponse.data.length; i++) {
      const prevDate = new Date(searchResponse.data[i - 1].created_at);
      const currDate = new Date(searchResponse.data[i].created_at);
      if (prevDate > currDate) return false;
    }
    return true;
  });

  // 8. Verify pagination calculation
  TestValidator.predicate("pagination pages calculation is correct", () => {
    const expectedPages = Math.ceil(
      searchResponse.pagination.records / searchResponse.pagination.limit,
    );
    return searchResponse.pagination.pages === expectedPages;
  });

  // 9. Validate that search returns at least the created users
  TestValidator.predicate(
    "search returns at least created user count",
    searchResponse.pagination.records >= createdUsers.length,
  );
}
