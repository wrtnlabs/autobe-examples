import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminSession";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Test filtering administrator sessions by creation date range using
 * created_at_after and created_at_before parameters.
 *
 * This scenario validates that administrators can filter their session history
 * by specific time periods for security auditing. The test creates an admin
 * account (generating one session), then tests date range filtering
 * functionality using timestamps before, during, and after the session creation
 * time.
 *
 * Steps:
 *
 * 1. Create admin account and establish initial session
 * 2. Retrieve all sessions without filters to get the session creation timestamp
 * 3. Test filtering with created_at_after using timestamp before session creation
 * 4. Test filtering with created_at_after using timestamp after session creation
 * 5. Test filtering with created_at_before using timestamp after session creation
 * 6. Test filtering with created_at_before using timestamp before session creation
 * 7. Test filtering with both created_at_after and created_at_before encompassing
 *    the session
 * 8. Verify filtering logic correctly includes/excludes sessions based on
 *    timestamps
 */
export async function test_api_admin_session_list_filtering_by_creation_date(
  connection: api.IConnection,
) {
  // Step 1: Create admin account (this creates one session)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.100",
      href: "https://admin.example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Retrieve all sessions to get the created session
  const allSessions = await api.functional.todoList.admin.admins.sessions.index(
    connection,
    {
      adminId: admin.id,
      body: {} satisfies ITodoListAdminSession.IRequest,
    },
  );
  typia.assert(allSessions);

  TestValidator.predicate(
    "should have at least 1 session created",
    allSessions.data.length >= 1,
  );

  const sessionCreatedAt = allSessions.data[0].created_at;
  const sessionDate = new Date(sessionCreatedAt);

  // Create timestamps for filtering tests
  const oneHourBefore = new Date(
    sessionDate.getTime() - 60 * 60 * 1000,
  ).toISOString();
  const oneHourAfter = new Date(
    sessionDate.getTime() + 60 * 60 * 1000,
  ).toISOString();
  const oneDayBefore = new Date(
    sessionDate.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneDayAfter = new Date(
    sessionDate.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  // Step 3: Test filtering with created_at_after using timestamp before session (should include session)
  const afterBeforeFilter =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        created_at_after: oneHourBefore,
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(afterBeforeFilter);

  TestValidator.predicate(
    "filter with created_at_after before session should include the session",
    afterBeforeFilter.data.length >= 1,
  );

  for (const session of afterBeforeFilter.data) {
    const currentSessionDate = new Date(session.created_at);
    const filterDate = new Date(oneHourBefore);
    TestValidator.predicate(
      "session created_at should be after or equal to filter timestamp",
      currentSessionDate >= filterDate,
    );
  }

  // Step 4: Test filtering with created_at_after using timestamp after session (should exclude session)
  const afterAfterFilter =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        created_at_after: oneHourAfter,
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(afterAfterFilter);

  TestValidator.predicate(
    "filter with created_at_after after session should exclude the session",
    afterAfterFilter.data.length === 0,
  );

  // Step 5: Test filtering with created_at_before using timestamp after session (should include session)
  const beforeAfterFilter =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        created_at_before: oneHourAfter,
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(beforeAfterFilter);

  TestValidator.predicate(
    "filter with created_at_before after session should include the session",
    beforeAfterFilter.data.length >= 1,
  );

  for (const session of beforeAfterFilter.data) {
    const currentSessionDate = new Date(session.created_at);
    const filterDate = new Date(oneHourAfter);
    TestValidator.predicate(
      "session created_at should be before or equal to filter timestamp",
      currentSessionDate <= filterDate,
    );
  }

  // Step 6: Test filtering with created_at_before using timestamp before session (should exclude session)
  const beforeBeforeFilter =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        created_at_before: oneHourBefore,
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(beforeBeforeFilter);

  TestValidator.predicate(
    "filter with created_at_before before session should exclude the session",
    beforeBeforeFilter.data.length === 0,
  );

  // Step 7: Test filtering with both created_at_after and created_at_before encompassing the session
  const rangeFilter = await api.functional.todoList.admin.admins.sessions.index(
    connection,
    {
      adminId: admin.id,
      body: {
        created_at_after: oneDayBefore,
        created_at_before: oneDayAfter,
      } satisfies ITodoListAdminSession.IRequest,
    },
  );
  typia.assert(rangeFilter);

  TestValidator.predicate(
    "range filter encompassing session should include the session",
    rangeFilter.data.length >= 1,
  );

  // Step 8: Verify all sessions in range are within the specified timestamps
  for (const session of rangeFilter.data) {
    const currentSessionDate = new Date(session.created_at);
    const startDate = new Date(oneDayBefore);
    const endDate = new Date(oneDayAfter);

    TestValidator.predicate(
      "session created_at should be within the date range",
      currentSessionDate >= startDate && currentSessionDate <= endDate,
    );
  }

  // Step 9: Test edge case - narrow range that excludes the session
  const twoHoursAfter = new Date(
    sessionDate.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString();
  const threeHoursAfter = new Date(
    sessionDate.getTime() + 3 * 60 * 60 * 1000,
  ).toISOString();

  const excludeRangeFilter =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        created_at_after: twoHoursAfter,
        created_at_before: threeHoursAfter,
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(excludeRangeFilter);

  TestValidator.predicate(
    "range filter excluding session should return empty results",
    excludeRangeFilter.data.length === 0,
  );
}
