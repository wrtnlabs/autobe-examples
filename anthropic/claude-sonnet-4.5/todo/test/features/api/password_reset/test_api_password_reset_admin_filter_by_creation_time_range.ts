import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListPasswordReset";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that administrators can filter password reset requests by creation
 * timestamp range.
 *
 * This test validates the admin's ability to search password reset requests
 * using creation time filters (created_after and created_before). The test
 * ensures that:
 *
 * 1. Admin can authenticate and access password reset search functionality
 * 2. Multiple password reset requests can be created at different times
 * 3. Created_after filter returns only requests created after the specified
 *    timestamp
 * 4. Created_before filter returns only requests created before the specified
 *    timestamp
 * 5. Combined filters create an accurate time window for filtering
 * 6. All timestamp comparisons work correctly with ISO 8601 format
 */
export async function test_api_password_reset_admin_filter_by_creation_time_range(
  connection: api.IConnection,
) {
  // Step 1: Create a test user for password reset requests
  const testUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123",
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(testUser);

  // Step 2: Authenticate as administrator
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "adminPassword123",
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create unauthenticated connection for password reset requests
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Capture timestamp before first request
  const beforeFirst = new Date().toISOString();

  // Wait to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Create first password reset request
  const reset1 =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      unauthConn,
      {
        body: {
          email: testUser.email,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(reset1);

  // Wait to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Capture timestamp for middle boundary
  const middleTimestamp = new Date().toISOString();

  // Wait to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Create second password reset request
  const reset2 =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      unauthConn,
      {
        body: {
          email: testUser.email,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(reset2);

  // Wait again
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Create third password reset request
  const reset3 =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      unauthConn,
      {
        body: {
          email: testUser.email,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(reset3);

  // Wait to ensure all requests are persisted
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Capture timestamp after all requests
  const afterLast = new Date().toISOString();

  // Step 4: Test created_after filter (should return requests after beforeFirst)
  const afterResults =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: testUser.id,
      body: {
        created_after: beforeFirst,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(afterResults);

  // Validate that all returned requests were created after beforeFirst
  TestValidator.predicate(
    "created_after filter returns only requests after specified timestamp",
    afterResults.data.length > 0 &&
      afterResults.data.every((request) => {
        const createdAt = new Date(request.created_at);
        const filterTime = new Date(beforeFirst);
        return createdAt >= filterTime;
      }),
  );

  // Step 5: Test created_before filter (should return requests before afterLast)
  const beforeResults =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: testUser.id,
      body: {
        created_before: afterLast,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(beforeResults);

  // Validate that all returned requests were created before afterLast
  TestValidator.predicate(
    "created_before filter returns only requests before specified timestamp",
    beforeResults.data.length > 0 &&
      beforeResults.data.every((request) => {
        const createdAt = new Date(request.created_at);
        const filterTime = new Date(afterLast);
        return createdAt <= filterTime;
      }),
  );

  // Step 6: Test combined created_after and created_before filters (time window)
  const windowResults =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: testUser.id,
      body: {
        created_after: beforeFirst,
        created_before: afterLast,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(windowResults);

  // Validate that all returned requests fall within the time window
  TestValidator.predicate(
    "combined filters create accurate time window",
    windowResults.data.length > 0 &&
      windowResults.data.every((request) => {
        const createdAt = new Date(request.created_at);
        const afterTime = new Date(beforeFirst);
        const beforeTime = new Date(afterLast);
        return createdAt >= afterTime && createdAt <= beforeTime;
      }),
  );

  // Step 7: Test narrow time window (between middle timestamps)
  const narrowResults =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: testUser.id,
      body: {
        created_after: middleTimestamp,
        created_before: afterLast,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(narrowResults);

  // Validate narrow time window filters correctly
  TestValidator.predicate(
    "narrow time window filters requests correctly",
    narrowResults.data.every((request) => {
      const createdAt = new Date(request.created_at);
      const afterTime = new Date(middleTimestamp);
      const beforeTime = new Date(afterLast);
      return createdAt >= afterTime && createdAt <= beforeTime;
    }),
  );

  // Step 8: Verify ISO 8601 format works correctly
  TestValidator.predicate(
    "timestamps are in valid ISO 8601 format",
    windowResults.data.every((request) => {
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      return isoRegex.test(request.created_at);
    }),
  );
}
