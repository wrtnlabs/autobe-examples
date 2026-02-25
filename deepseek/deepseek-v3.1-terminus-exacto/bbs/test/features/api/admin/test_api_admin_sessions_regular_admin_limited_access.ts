import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test session search limitations for regular administrators.
 * As a regular admin, verify that search results are restricted to own sessions only
 * even when using filters for other admin IDs or attempting to bypass restrictions.
 * Test that pagination and basic filtering work within the scope of permitted access.
 * Validate that session details include proper connection metadata but respect authorization boundaries.
 */
export async function test_api_admin_sessions_regular_admin_limited_access(
  connection: api.IConnection,
): Promise<void> {
  // Create first regular administrator
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  // Create second regular administrator
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);
  // Create some sessions for both admins by making API calls
  await api.functional.discussionBoard.admin.admins.sessions.index(
    admin1Connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardAdminSession.IRequest,
    },
  );
  await api.functional.discussionBoard.admin.admins.sessions.index(
    admin2Connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardAdminSession.IRequest,
    },
  );
  // Test 1: Admin1 should only see their own sessions
  const admin1Sessions =
    await api.functional.discussionBoard.admin.admins.sessions.index(
      admin1Connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(admin1Sessions);
  // Verify all sessions belong to admin1
  for (const session of admin1Sessions.data) {
    TestValidator.equals(
      "session admin ID matches admin1",
      session.admin.id,
      admin1.id,
    );
  }
  // Test 2: Admin2 should only see their own sessions
  const admin2Sessions =
    await api.functional.discussionBoard.admin.admins.sessions.index(
      admin2Connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(admin2Sessions);
  // Verify all sessions belong to admin2
  for (const session of admin2Sessions.data) {
    TestValidator.equals(
      "session admin ID matches admin2",
      session.admin.id,
      admin2.id,
    );
  }
  // Test 3: Admin1 trying to filter by admin2's ID should return empty results
  const filteredSessions =
    await api.functional.discussionBoard.admin.admins.sessions.index(
      admin1Connection,
      {
        body: {
          discussion_board_admin_id: admin2.id,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(filteredSessions);
  TestValidator.equals(
    "admin1 cannot see admin2 sessions",
    filteredSessions.data.length,
    0,
  );
  // Test 4: Test pagination works correctly
  const paginatedSessions =
    await api.functional.discussionBoard.admin.admins.sessions.index(
      admin1Connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(paginatedSessions);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedSessions.data.length <= 1,
  );
  // Test 5: Test basic filtering works within authorized scope
  const activeSessions =
    await api.functional.discussionBoard.admin.admins.sessions.index(
      admin1Connection,
      {
        body: {
          active_only: true,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // Verify all returned sessions belong to admin1
  for (const session of activeSessions.data) {
    TestValidator.equals(
      "active session admin ID matches admin1",
      session.admin.id,
      admin1.id,
    );
  }
  // Test 6: Validate session metadata includes proper connection details
  if (admin1Sessions.data.length > 0) {
    const sampleSession = admin1Sessions.data[0];
    TestValidator.predicate(
      "session has IP address",
      sampleSession.ip.length > 0,
    );
    TestValidator.predicate(
      "session has user agent",
      sampleSession.user_agent.length > 0,
    );
    TestValidator.predicate(
      "session has creation timestamp",
      sampleSession.created_at.length > 0,
    );
    TestValidator.predicate(
      "session has expiration timestamp",
      sampleSession.expired_at.length > 0,
    );
    TestValidator.predicate(
      "session has last access timestamp",
      sampleSession.last_accessed_at.length > 0,
    );
  }
}
