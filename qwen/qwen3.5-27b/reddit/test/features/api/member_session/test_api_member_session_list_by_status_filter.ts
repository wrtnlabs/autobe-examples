import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member can filter their sessions by status (active, expired, or terminated).
 *
 * Validates the session filtering functionality by testing all three status filters: active, expired, and terminated. The test registers a new member which automatically creates an active session, then verifies that each status filter returns the correct subset of sessions.
 *
 * Special attention is given to verifying that the status computation is correct based on deleted_at and expired_at columns, and that pagination metadata accurately reflects the filtered results.
 *
 * 1. Register a new member account (creates active session automatically).
 * 2. Use the authenticated connection from registration for API calls.
 * 3. Filter sessions by 'active' status and verify the created session is returned.
 * 4. Filter sessions by 'expired' status and verify empty result (session still active).
 * 5. Filter sessions by 'terminated' status and verify empty result (no logout).
 * 6. Validate pagination metadata for each filter result.
 */
export async function test_api_member_session_list_by_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (creates active session automatically)
  // authorize_member_join sets headers internally on memberConnection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Filter sessions by 'active' status
  const activeSessions =
    await api.functional.redditClone.member.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "active",
        } satisfies IRedditCloneMemberSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // Verify active sessions contain the created session
  TestValidator.predicate(
    "active filter returns at least one session",
    activeSessions.data.length > 0,
  );
  TestValidator.equals(
    "active session belongs to authenticated member",
    activeSessions.data[0].member.id,
    member.id,
  );
  TestValidator.equals(
    "active session has null deleted_at",
    activeSessions.data[0].deleted_at,
    null,
  );
  TestValidator.predicate(
    "active session has future expired_at",
    new Date(activeSessions.data[0].expired_at) > new Date(),
  );
  // Verify pagination for active sessions
  TestValidator.equals(
    "active sessions pagination current page",
    activeSessions.pagination.current,
    1,
  );
  TestValidator.equals(
    "active sessions pagination records matches data length",
    activeSessions.pagination.records,
    activeSessions.data.length,
  );
  // 3. Filter sessions by 'expired' status
  const expiredSessions =
    await api.functional.redditClone.member.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "expired",
        } satisfies IRedditCloneMemberSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // Verify expired sessions is empty (session is still active)
  TestValidator.equals(
    "expired filter returns empty list",
    expiredSessions.data.length,
    0,
  );
  TestValidator.equals(
    "expired sessions pagination records",
    expiredSessions.pagination.records,
    0,
  );
  // 4. Filter sessions by 'terminated' status
  const terminatedSessions =
    await api.functional.redditClone.member.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "terminated",
        } satisfies IRedditCloneMemberSession.IRequest,
      },
    );
  typia.assert(terminatedSessions);
  // Verify terminated sessions is empty (no logout occurred)
  TestValidator.equals(
    "terminated filter returns empty list",
    terminatedSessions.data.length,
    0,
  );
  TestValidator.equals(
    "terminated sessions pagination records",
    terminatedSessions.pagination.records,
    0,
  );
  // 5. Validate session membership and data integrity
  TestValidator.equals(
    "active session member email matches registered member",
    activeSessions.data[0].member.email,
    member.email,
  );
  TestValidator.equals(
    "active session member username matches registered member",
    activeSessions.data[0].member.username,
    member.username,
  );
  TestValidator.predicate(
    "active session has valid member profile",
    activeSessions.data[0].member.profile !== undefined,
  );
  TestValidator.predicate(
    "active session member profile display name exists",
    activeSessions.data[0].member.profile.display_name.length > 0,
  );
}
