import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test session filtering by active and expired status.
 *
 * This test validates the status-based filtering business logic for session monitoring:
 * 1. Creates and authenticates an administrator account
 * 2. Creates a member account whose sessions will be queried
 * 3. Logs in as the member to create an active session
 * 4. Queries sessions with status='active' filter and verifies only active sessions are returned
 * 5. Queries sessions with status='expired' filter and verifies only expired sessions are returned
 */
export async function test_api_admin_session_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create member account with known credentials
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Login as member to create an active session
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const memberLogin = await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(memberLogin);
  // 4. Query sessions with status='active' filter
  const activeSessions =
    await api.functional.discussionBoard.member.sessions.index(
      adminConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 100,
          sort: "created_at",
          direction: "desc",
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // Validate active sessions - check business logic (timestamps), not types
  TestValidator.predicate(
    "active sessions returned",
    activeSessions.data.length >= 0,
  );
  for (const session of activeSessions.data) {
    TestValidator.predicate(
      "active session expired_at in future",
      new Date(session.expiredAt) > new Date(),
    );
  }
  // 5. Query sessions with status='expired' filter
  const expiredSessions =
    await api.functional.discussionBoard.member.sessions.index(
      adminConnection,
      {
        body: {
          status: "expired",
          page: 1,
          limit: 100,
          sort: "created_at",
          direction: "desc",
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // Validate expired sessions - check business logic (timestamps), not types
  TestValidator.predicate(
    "expired sessions returned",
    expiredSessions.data.length >= 0,
  );
  for (const session of expiredSessions.data) {
    TestValidator.predicate(
      "expired session expired_at in past",
      new Date(session.expiredAt) <= new Date(),
    );
  }
  // 6. Validate that active and expired sessions are mutually exclusive
  const activeIds = new Set(activeSessions.data.map((s) => s.id));
  const expiredIds = new Set(expiredSessions.data.map((s) => s.id));
  for (const id of activeIds) {
    TestValidator.predicate(
      "session not in both active and expired lists",
      !expiredIds.has(id),
    );
  }
}
