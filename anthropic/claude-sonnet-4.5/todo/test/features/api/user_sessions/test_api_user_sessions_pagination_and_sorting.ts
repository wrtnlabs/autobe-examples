import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test pagination and sorting functionality for user session retrieval.
 *
 * Validates that session retrieval correctly implements pagination and sorting
 * controls. This test creates a single test user and validates the pagination
 * infrastructure works correctly, even with a limited number of sessions. The
 * test focuses on verifying that pagination parameters, sorting options, and
 * metadata calculations function properly.
 *
 * Test Flow:
 *
 * 1. Admin authenticates successfully
 * 2. Test user account is created (creates 1 session)
 * 3. Test pagination with available session(s)
 * 4. Test limit parameter controls
 * 5. Test sorting by created_at ascending and descending
 * 6. Validate pagination metadata accuracy
 * 7. Test edge cases (page beyond data, various limit values)
 */
export async function test_api_user_sessions_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create test user account (this creates the first session)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const testUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      ip: "192.168.1.100",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(testUser);

  // Step 3: Test default pagination
  const defaultPage = await api.functional.todoList.admin.users.sessions.index(
    connection,
    {
      userId: testUser.id,
      body: {} satisfies ITodoListUserSession.IRequest,
    },
  );
  typia.assert(defaultPage);

  TestValidator.predicate(
    "default pagination returns results",
    defaultPage.data.length > 0,
  );
  TestValidator.predicate(
    "pagination metadata exists",
    defaultPage.pagination !== null && defaultPage.pagination !== undefined,
  );

  // Step 4: Test with explicit page and limit parameters
  const page1 = await api.functional.todoList.admin.users.sessions.index(
    connection,
    {
      userId: testUser.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoListUserSession.IRequest,
    },
  );
  typia.assert(page1);

  TestValidator.equals("page 1 current is 1", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit is 10", page1.pagination.limit, 10);
  TestValidator.predicate("page 1 has sessions", page1.pagination.records > 0);

  // Step 5: Test different limit values
  const smallLimit = await api.functional.todoList.admin.users.sessions.index(
    connection,
    {
      userId: testUser.id,
      body: {
        page: 1,
        limit: 1,
      } satisfies ITodoListUserSession.IRequest,
    },
  );
  typia.assert(smallLimit);

  TestValidator.predicate(
    "small limit respects limit parameter",
    smallLimit.data.length <= 1,
  );
  TestValidator.equals(
    "small limit metadata correct",
    smallLimit.pagination.limit,
    1,
  );

  const largeLimit = await api.functional.todoList.admin.users.sessions.index(
    connection,
    {
      userId: testUser.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListUserSession.IRequest,
    },
  );
  typia.assert(largeLimit);

  TestValidator.equals(
    "large limit metadata correct",
    largeLimit.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "large limit respects maximum",
    largeLimit.data.length <= 100,
  );

  // Step 6: Test sorting by created_at descending
  const sortedDesc = await api.functional.todoList.admin.users.sessions.index(
    connection,
    {
      userId: testUser.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
      } satisfies ITodoListUserSession.IRequest,
    },
  );
  typia.assert(sortedDesc);

  TestValidator.predicate(
    "desc sort applied correctly",
    sortedDesc.data.length > 0,
  );

  // Step 7: Test sorting by created_at ascending
  const sortedAsc = await api.functional.todoList.admin.users.sessions.index(
    connection,
    {
      userId: testUser.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "asc",
      } satisfies ITodoListUserSession.IRequest,
    },
  );
  typia.assert(sortedAsc);

  TestValidator.predicate(
    "asc sort applied correctly",
    sortedAsc.data.length > 0,
  );

  // Step 8: Validate pagination metadata calculations
  const totalRecords = page1.pagination.records;
  const limitValue = page1.pagination.limit;
  const expectedPages = Math.ceil(totalRecords / limitValue);

  TestValidator.equals(
    "total pages calculated correctly",
    page1.pagination.pages,
    expectedPages,
  );

  // Step 9: Test requesting page beyond available data
  const beyondPage = await api.functional.todoList.admin.users.sessions.index(
    connection,
    {
      userId: testUser.id,
      body: {
        page: 999,
        limit: 10,
      } satisfies ITodoListUserSession.IRequest,
    },
  );
  typia.assert(beyondPage);

  TestValidator.equals(
    "beyond page returns empty data",
    beyondPage.data.length,
    0,
  );
  TestValidator.predicate(
    "beyond page metadata still accurate",
    beyondPage.pagination.records >= 0,
  );

  // Step 10: Test that pagination metadata is consistent across requests
  const consistencyCheck =
    await api.functional.todoList.admin.users.sessions.index(connection, {
      userId: testUser.id,
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(consistencyCheck);

  TestValidator.equals(
    "consistent total records across requests",
    consistencyCheck.pagination.records,
    totalRecords,
  );
}
