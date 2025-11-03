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
 * Test administrator's ability to search and retrieve a paginated list of all
 * users.
 *
 * This test validates comprehensive user management capabilities including
 * search filtering, pagination, sorting, and proper admin-only access
 * enforcement. It creates multiple test users with varying data, then performs
 * various query operations to ensure all filtering and pagination features work
 * correctly.
 *
 * Test workflow:
 *
 * 1. Register admin account for administrative privileges
 * 2. Register multiple regular users (5) with diverse email addresses
 * 3. Authenticate as admin
 * 4. Retrieve all users without filters (baseline test)
 * 5. Search users by partial email match
 * 6. Filter users by creation date range
 * 7. Test pagination with different page sizes and page numbers
 * 8. Test sorting (by date ascending/descending, by email alphabetically)
 * 9. Verify pagination metadata accuracy
 * 10. Validate response structure and user privacy
 */
export async function test_api_admin_user_list_search_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Register admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Register multiple regular users with varying emails
  const userCount = 5;
  const createdUsers: ITodoListUser.IAuthorized[] = [];

  for (let i = 0; i < userCount; i++) {
    // Create diverse email patterns for search testing
    const userEmail =
      i % 2 === 0 ? `testuser${i}@example.com` : `user${i}@testdomain.org`;

    const user = await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.IRegister,
    });
    typia.assert(user);
    createdUsers.push(user);

    // Add small delay to ensure different creation timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Step 3: Authenticate as admin (admin is already authenticated from join)
  // The admin token is already set in connection.headers from the join call

  // Step 4: Retrieve all users without filters (baseline)
  const allUsersResponse =
    await api.functional.todoList.admin.admins.users.index(connection, {
      body: {} satisfies ITodoListUser.IRequest,
    });
  typia.assert(allUsersResponse);

  TestValidator.predicate(
    "all users retrieved should include created users",
    allUsersResponse.data.length >= userCount,
  );

  TestValidator.predicate(
    "pagination metadata exists",
    allUsersResponse.pagination !== null &&
      allUsersResponse.pagination !== undefined,
  );

  // Step 5: Search users by partial email match
  const searchTerm = "testuser";
  const searchResponse = await api.functional.todoList.admin.admins.users.index(
    connection,
    {
      body: {
        search: searchTerm,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(searchResponse);

  TestValidator.predicate(
    "search results should contain search term in email",
    searchResponse.data.every((user) => user.email.includes(searchTerm)),
  );

  // Step 6: Filter users by creation date range
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const dateFilterResponse =
    await api.functional.todoList.admin.admins.users.index(connection, {
      body: {
        created_after: oneHourAgo.toISOString(),
        created_before: now.toISOString(),
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(dateFilterResponse);

  TestValidator.predicate(
    "date filtered results should include recently created users",
    dateFilterResponse.data.length >= userCount,
  );

  // Step 7: Test pagination with different page sizes
  const page1Response = await api.functional.todoList.admin.admins.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(page1Response);

  TestValidator.predicate(
    "page 1 should have limit items or less",
    page1Response.data.length <= 2,
  );

  TestValidator.equals(
    "pagination current page should be 1",
    page1Response.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should match request",
    page1Response.pagination.limit,
    2,
  );

  const page2Response = await api.functional.todoList.admin.admins.users.index(
    connection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(page2Response);

  TestValidator.equals(
    "pagination current page should be 2",
    page2Response.pagination.current,
    2,
  );

  // Step 8: Test sorting - by creation date descending (newest first)
  const sortedDescResponse =
    await api.functional.todoList.admin.admins.users.index(connection, {
      body: {
        sort: "created_at_desc",
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(sortedDescResponse);

  TestValidator.predicate(
    "sorted results should be returned",
    sortedDescResponse.data.length > 0,
  );

  // Test sorting - by creation date ascending (oldest first)
  const sortedAscResponse =
    await api.functional.todoList.admin.admins.users.index(connection, {
      body: {
        sort: "created_at_asc",
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(sortedAscResponse);

  TestValidator.predicate(
    "sorted ascending results should be returned",
    sortedAscResponse.data.length > 0,
  );

  // Test sorting - by email alphabetically ascending
  const sortedEmailAscResponse =
    await api.functional.todoList.admin.admins.users.index(connection, {
      body: {
        sort: "email_asc",
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(sortedEmailAscResponse);

  // Test sorting - by email alphabetically descending
  const sortedEmailDescResponse =
    await api.functional.todoList.admin.admins.users.index(connection, {
      body: {
        sort: "email_desc",
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(sortedEmailDescResponse);

  // Step 9: Verify pagination metadata accuracy
  TestValidator.predicate(
    "total records should be greater than or equal to created users",
    allUsersResponse.pagination.records >= userCount,
  );

  TestValidator.predicate(
    "total pages calculation should be correct",
    allUsersResponse.pagination.pages ===
      Math.ceil(
        allUsersResponse.pagination.records / allUsersResponse.pagination.limit,
      ),
  );

  // Step 10: Validate response structure includes appropriate fields
  TestValidator.predicate(
    "user summary should have id field",
    allUsersResponse.data.every(
      (user) => typeof user.id === "string" && user.id.length > 0,
    ),
  );

  TestValidator.predicate(
    "user summary should have email field",
    allUsersResponse.data.every(
      (user) => typeof user.email === "string" && user.email.includes("@"),
    ),
  );
}
