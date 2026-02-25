import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: "test_admin_" + RandomGenerator.alphaNumeric(6) + "@test.com",
      password: "TestPassword123!",
      display_name: "Test Admin " + RandomGenerator.alphaNumeric(4),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminUser);
  // Get current time for expiration calculations
  const now = new Date();
  const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
  // Test filtering by isActive=true (active sessions - not yet expired)
  const activeSessions =
    await api.functional.discussionBoard.admin.admin_sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          isActive: true,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // Validate active sessions have future expiration times
  for (const session of activeSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "active session has future expiration time",
      expiredAt.getTime() > now.getTime(),
    );
  }
  // Test filtering by isActive=false (inactive sessions - already expired)
  const inactiveSessions =
    await api.functional.discussionBoard.admin.admin_sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          isActive: false,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(inactiveSessions);
  // Validate inactive sessions have past expiration times
  for (const session of inactiveSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "inactive session has past expiration time",
      expiredAt.getTime() <= now.getTime(),
    );
  }
  // Validate that active and inactive sessions are mutually exclusive
  const allActive =
    await api.functional.discussionBoard.admin.admin_sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          isActive: true,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(allActive);
  const allInactive =
    await api.functional.discussionBoard.admin.admin_sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          isActive: false,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(allInactive);
  // Get all session IDs and validate no overlap between active and inactive
  const activeIds = new Set(allActive.data.map((s) => s.id));
  const inactiveIds = new Set(allInactive.data.map((s) => s.id));
  const hasOverlap = Array.from(activeIds).some((id) => inactiveIds.has(id));
  TestValidator.predicate(
    "active and inactive sessions are mutually exclusive",
    !hasOverlap,
  );
  // Test admin summary includes required fields
  const allSessions =
    await api.functional.discussionBoard.admin.admin_sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          isActive: true,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(allSessions);
  // Validate admin summary structure
  for (const session of allSessions.data) {
    TestValidator.predicate(
      "session has admin with id",
      session.admin.id !== undefined,
    );
    TestValidator.predicate(
      "session has admin with display_name",
      session.admin.display_name !== undefined,
    );
    TestValidator.predicate(
      "session has admin with email",
      session.admin.email !== undefined,
    );
    TestValidator.predicate(
      "session has admin with is_active",
      session.admin.is_active !== undefined,
    );
    TestValidator.predicate(
      "session has admin with created_at",
      session.admin.created_at !== undefined,
    );
  }
}
