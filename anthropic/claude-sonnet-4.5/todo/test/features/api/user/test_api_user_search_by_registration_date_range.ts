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
 * Test filtering users by registration date ranges using created_after and
 * created_before parameters.
 *
 * This test validates administrators' ability to analyze user registration
 * patterns within specific time periods. It tests various date range
 * combinations including users registered after a specific date, before a
 * specific date, within a date range (both parameters), and with no date
 * filters.
 *
 * Steps:
 *
 * 1. Authenticate as administrator
 * 2. Create multiple test users with different registration timestamps
 * 3. Test filtering users registered after a specific date
 * 4. Test filtering users registered before a specific date
 * 5. Test filtering users within a specific date range (both parameters)
 * 6. Test filtering with no date filters (all users)
 * 7. Verify that combining date filters with other criteria works correctly
 */
export async function test_api_user_search_by_registration_date_range(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      ip: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Store admin token for later restoration
  const adminToken = admin.token.access;

  // Step 2: Create multiple test users with different registration timestamps
  const users: ITodoListUser.IAuthorized[] = [];
  const userCount = 5;

  for (let i = 0; i < userCount; i++) {
    // Create fresh unauthenticated connection for each user registration
    const userConnection: api.IConnection = {
      host: connection.host,
      headers: {},
    };

    const user = await api.functional.auth.user.join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string>(),
        ip: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
    typia.assert(user);
    users.push(user);
  }

  // Restore admin authentication
  connection.headers = connection.headers || {};
  connection.headers.Authorization = adminToken;

  // Get the middle user's timestamp as a reference point
  const middleUser = users[Math.floor(users.length / 2)];
  typia.assertGuard(middleUser);
  const middleTimestamp = middleUser.created_at;

  // Step 3: Test filtering users registered after a specific date
  const usersAfter = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        created_after: middleTimestamp,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(usersAfter);

  // Verify all returned users were created after the specified date
  for (const user of usersAfter.data) {
    TestValidator.predicate(
      "user created after filter date",
      new Date(user.created_at).getTime() >=
        new Date(middleTimestamp).getTime(),
    );
  }

  // Step 4: Test filtering users registered before a specific date
  const usersBefore = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        created_before: middleTimestamp,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(usersBefore);

  // Verify all returned users were created before the specified date
  for (const user of usersBefore.data) {
    TestValidator.predicate(
      "user created before filter date",
      new Date(user.created_at).getTime() <=
        new Date(middleTimestamp).getTime(),
    );
  }

  // Step 5: Test filtering users within a specific date range
  const firstUser = users[0];
  typia.assertGuard(firstUser);
  const lastUser = users[users.length - 1];
  typia.assertGuard(lastUser);

  const usersInRange = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        created_after: firstUser.created_at,
        created_before: lastUser.created_at,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(usersInRange);

  // Verify all returned users are within the date range
  for (const user of usersInRange.data) {
    const userTime = new Date(user.created_at).getTime();
    const afterTime = new Date(firstUser.created_at).getTime();
    const beforeTime = new Date(lastUser.created_at).getTime();

    TestValidator.predicate(
      "user within date range",
      userTime >= afterTime && userTime <= beforeTime,
    );
  }

  // Step 6: Test filtering with no date filters (all users)
  const allUsers = await api.functional.todoList.admin.users.index(connection, {
    body: {
      page: 1,
      limit: 100,
    } satisfies ITodoListUser.IRequest,
  });
  typia.assert(allUsers);

  // Verify pagination structure
  TestValidator.predicate(
    "pagination structure is valid",
    allUsers.pagination.current >= 0 &&
      allUsers.pagination.limit > 0 &&
      allUsers.pagination.records >= 0 &&
      allUsers.pagination.pages >= 0,
  );

  // Step 7: Verify combining date filters with other criteria
  const combinedFilter = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        created_after: firstUser.created_at,
        email_verified: false,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(combinedFilter);

  // Verify all returned users match both criteria
  for (const user of combinedFilter.data) {
    TestValidator.predicate(
      "user matches date filter",
      new Date(user.created_at).getTime() >=
        new Date(firstUser.created_at).getTime(),
    );
    TestValidator.equals(
      "user matches email_verified filter",
      user.email_verified,
      false,
    );
  }
}
