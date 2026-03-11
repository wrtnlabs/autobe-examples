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
 * Test session search functionality by user identifier.
 *
 * This test validates the administrative session monitoring capabilities:
 * 1. Administrator authenticates to access session monitoring
 * 2. Member account is created and logged in to generate session
 * 3. Administrator queries sessions filtered by member's user_id
 * 4. Verifies only sessions belonging to the specified user are returned
 * 5. Validates display names are correctly joined from member/admin tables
 * 6. Tests IP address partial match filtering for security investigation
 */
export async function test_api_admin_session_search_by_user_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Login as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 3. Create member account to generate session
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberAuth = await authorize_member_join(memberJoinConnection, {
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
  // 4. Login as member to create session record
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
  // 5. Administrator searches sessions by member's user_id
  const sessionSearchByUserId =
    await api.functional.discussionBoard.member.sessions.index(
      adminConnection,
      {
        body: {
          user_id: memberAuth.id,
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "desc",
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(sessionSearchByUserId);
  // 6. Validate search results - sessions belong to the specified user
  TestValidator.predicate(
    "sessions belong to specified user",
    sessionSearchByUserId.data.every(
      (session) => session.displayName === memberAuth.display_name,
    ),
  );
  // 7. Test IP address partial match filtering
  const testIp = typia.random<string & tags.Format<"ipv4">>();
  const sessionSearchByIp =
    await api.functional.discussionBoard.member.sessions.index(
      adminConnection,
      {
        body: {
          ip: testIp.substring(0, 8),
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "desc",
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(sessionSearchByIp);
  // 8. Test combined user_id and status filter for active sessions
  const sessionSearchActive =
    await api.functional.discussionBoard.member.sessions.index(
      adminConnection,
      {
        body: {
          user_id: memberAuth.id,
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(sessionSearchActive);
  // 9. Validate all returned sessions are active
  TestValidator.predicate(
    "all sessions are active",
    sessionSearchActive.data.every((session) => session.status === "active"),
  );
}