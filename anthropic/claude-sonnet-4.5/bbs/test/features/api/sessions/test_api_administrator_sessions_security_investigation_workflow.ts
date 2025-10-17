import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSession";

/**
 * Test the complete security investigation workflow where administrators filter
 * and analyze user sessions to identify suspicious activity patterns.
 *
 * This test validates the comprehensive security investigation capabilities
 * available to administrators for monitoring user sessions and detecting
 * potential security issues.
 *
 * Steps:
 *
 * 1. Register a new administrator account using /auth/administrator/join
 * 2. Register a member account using /auth/member/join to simulate a user with
 *    sessions
 * 3. As administrator, retrieve the member's sessions with filtering applied
 *    (e.g., filter by date range, IP address pattern, or location)
 * 4. Validate that filtered results help identify specific session patterns
 * 5. Verify that administrators can sort sessions by login timestamp to identify
 *    chronological patterns
 * 6. Test filtering by IP address to track sessions from specific locations
 * 7. Validate that session metadata provides sufficient information for security
 *    assessment
 * 8. Confirm that administrators can identify potentially suspicious sessions
 *    (unusual locations, unfamiliar devices)
 */
export async function test_api_administrator_sessions_security_investigation_workflow(
  connection: api.IConnection,
) {
  // Step 1: Register administrator account with security investigation privileges
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // Step 2: Register member account to generate session data for investigation
  const memberCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCredentials,
    });
  typia.assert(member);

  // Step 3: As administrator, retrieve member's sessions with date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeFilteredSessions: IPageIDiscussionBoardSession =
    await api.functional.discussionBoard.administrator.users.sessions.index(
      connection,
      {
        userId: member.id,
        body: {
          created_after: thirtyDaysAgo.toISOString(),
          created_before: now.toISOString(),
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSession.IRequest,
      },
    );
  typia.assert(dateRangeFilteredSessions);

  // Step 4: Validate that filtered results help identify specific session patterns
  TestValidator.predicate(
    "date range filtering returns valid pagination structure",
    dateRangeFilteredSessions.pagination !== null &&
      dateRangeFilteredSessions.pagination !== undefined,
  );

  TestValidator.predicate(
    "filtered session data is an array",
    Array.isArray(dateRangeFilteredSessions.data),
  );

  // Step 5: Verify administrators can sort sessions by login timestamp for chronological patterns
  const chronologicalSessions: IPageIDiscussionBoardSession =
    await api.functional.discussionBoard.administrator.users.sessions.index(
      connection,
      {
        userId: member.id,
        body: {
          sort_by: "created_at",
          sort_order: "asc",
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardSession.IRequest,
      },
    );
  typia.assert(chronologicalSessions);

  TestValidator.predicate(
    "chronological sorting returns valid session data",
    Array.isArray(chronologicalSessions.data),
  );

  // Step 6: Test filtering by IP address to track sessions from specific locations
  const ipAddressPattern = "192.168";
  const ipFilteredSessions: IPageIDiscussionBoardSession =
    await api.functional.discussionBoard.administrator.users.sessions.index(
      connection,
      {
        userId: member.id,
        body: {
          ip_address: ipAddressPattern,
          sort_by: "last_activity_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSession.IRequest,
      },
    );
  typia.assert(ipFilteredSessions);

  // Step 7: Validate that session metadata provides sufficient information for security assessment
  const deviceTypeFilteredSessions: IPageIDiscussionBoardSession =
    await api.functional.discussionBoard.administrator.users.sessions.index(
      connection,
      {
        userId: member.id,
        body: {
          device_type: "Desktop",
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardSession.IRequest,
      },
    );
  typia.assert(deviceTypeFilteredSessions);

  // Validate session metadata contains security-relevant information
  if (deviceTypeFilteredSessions.data.length > 0) {
    const sessionSample = deviceTypeFilteredSessions.data[0];
    typia.assertGuard(sessionSample);

    TestValidator.predicate(
      "session contains device type information",
      typeof sessionSample.device_type === "string" &&
        sessionSample.device_type.length > 0,
    );

    TestValidator.predicate(
      "session contains browser information",
      typeof sessionSample.browser_info === "string" &&
        sessionSample.browser_info.length > 0,
    );

    TestValidator.predicate(
      "session contains IP address",
      typeof sessionSample.ip_address === "string" &&
        sessionSample.ip_address.length > 0,
    );
  }

  // Step 8: Test location-based filtering for identifying suspicious sessions
  const locationFilteredSessions: IPageIDiscussionBoardSession =
    await api.functional.discussionBoard.administrator.users.sessions.index(
      connection,
      {
        userId: member.id,
        body: {
          location: "New York",
          is_active: true,
          sort_by: "last_activity_at",
          sort_order: "desc",
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardSession.IRequest,
      },
    );
  typia.assert(locationFilteredSessions);

  // Test browser-based filtering for detecting unfamiliar devices
  const browserFilteredSessions: IPageIDiscussionBoardSession =
    await api.functional.discussionBoard.administrator.users.sessions.index(
      connection,
      {
        userId: member.id,
        body: {
          browser_info: "Chrome",
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 30,
        } satisfies IDiscussionBoardSession.IRequest,
      },
    );
  typia.assert(browserFilteredSessions);

  // Validate that administrators can retrieve only active sessions for real-time monitoring
  const activeSessionsOnly: IPageIDiscussionBoardSession =
    await api.functional.discussionBoard.administrator.users.sessions.index(
      connection,
      {
        userId: member.id,
        body: {
          is_active: true,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSession.IRequest,
      },
    );
  typia.assert(activeSessionsOnly);

  TestValidator.predicate(
    "active sessions filter returns valid pagination",
    activeSessionsOnly.pagination.current >= 0 &&
      activeSessionsOnly.pagination.limit > 0,
  );

  // Test last activity filtering for identifying stale sessions
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentActivitySessions: IPageIDiscussionBoardSession =
    await api.functional.discussionBoard.administrator.users.sessions.index(
      connection,
      {
        userId: member.id,
        body: {
          last_activity_after: sevenDaysAgo.toISOString(),
          sort_by: "last_activity_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSession.IRequest,
      },
    );
  typia.assert(recentActivitySessions);

  // Validate comprehensive filtering combining multiple criteria for advanced security investigation
  const complexFilteredSessions: IPageIDiscussionBoardSession =
    await api.functional.discussionBoard.administrator.users.sessions.index(
      connection,
      {
        userId: member.id,
        body: {
          device_type: "Mobile",
          is_active: true,
          created_after: thirtyDaysAgo.toISOString(),
          last_activity_after: sevenDaysAgo.toISOString(),
          sort_by: "last_activity_at",
          sort_order: "desc",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSession.IRequest,
      },
    );
  typia.assert(complexFilteredSessions);

  TestValidator.predicate(
    "complex filtering returns valid session results",
    complexFilteredSessions.pagination.records >= 0,
  );
}
