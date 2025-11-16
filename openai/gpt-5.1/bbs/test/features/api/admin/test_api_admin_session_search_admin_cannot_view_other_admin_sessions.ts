import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminuserSession";

/**
 * Ensure an adminUser cannot retrieve another admin's sessions via the
 * discussionBoard admin session search API, while each admin can still
 * successfully list their own sessions.
 *
 * Business goals:
 *
 * - Validate that session search is strictly scoped per admin user: an
 *   authenticated admin can only see their own sessions, not sessions belonging
 *   to other admins.
 * - Demonstrate positive and negative access control behavior:
 *
 *   - Positive: Admin A and Admin B can each list their own sessions.
 *   - Negative: Admin A cannot list Admin B's sessions.
 *
 * Flow:
 *
 * 1. Join Admin A on the main connection (which will carry Admin A's token).
 * 2. Call sessions.index with adminUserId = Admin A.id and verify that all
 *    returned sessions, if any, belong to Admin A.
 * 3. Create a separate connection instance for Admin B with its own headers
 *    object, join as Admin B there, and verify Admin B can list their own
 *    sessions using that independent connection.
 * 4. Using the main connection (Admin A context), attempt to call sessions.index
 *    with adminUserId = Admin B.id and assert that this call fails with an
 *    error, without inspecting specific HTTP status codes.
 */
export async function test_api_admin_session_search_admin_cannot_view_other_admin_sessions(
  connection: api.IConnection,
) {
  // 1. Register and authenticate Admin A on the main connection.
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminA: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  // 2. Admin A lists own sessions.
  const adminASessionsRequest = {
    // All filters optional; send empty request to use backend defaults.
  } satisfies IDiscussionBoardAdminuserSession.IRequest;

  const adminASessionsPage: IPageIDiscussionBoardAdminuserSession.ISummary =
    await api.functional.discussionBoard.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId: adminA.id,
        body: adminASessionsRequest,
      },
    );
  typia.assert(adminASessionsPage);

  // Validate that all sessions, if any, belong to Admin A.
  for (const session of adminASessionsPage.data) {
    TestValidator.equals(
      "Admin A sessions must reference Admin A in foreign key",
      session.discussion_board_adminuser_id,
      adminA.id,
    );
    TestValidator.equals(
      "Admin A sessions must reference Admin A in embedded adminUser",
      session.adminUser.id,
      adminA.id,
    );
  }

  // 3. Create a separate connection for Admin B with an independent headers
  //    object so that its Authorization header changes do not affect the main
  //    connection.
  const adminBConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminB: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(adminBConnection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  // Admin B lists own sessions via its own connection.
  const adminBSessionsRequest = {
    // empty filter: rely on backend defaults
  } satisfies IDiscussionBoardAdminuserSession.IRequest;

  const adminBSessionsPage: IPageIDiscussionBoardAdminuserSession.ISummary =
    await api.functional.discussionBoard.adminUser.adminUsers.sessions.index(
      adminBConnection,
      {
        adminUserId: adminB.id,
        body: adminBSessionsRequest,
      },
    );
  typia.assert(adminBSessionsPage);

  for (const session of adminBSessionsPage.data) {
    TestValidator.equals(
      "Admin B sessions must reference Admin B in foreign key",
      session.discussion_board_adminuser_id,
      adminB.id,
    );
    TestValidator.equals(
      "Admin B sessions must reference Admin B in embedded adminUser",
      session.adminUser.id,
      adminB.id,
    );
  }

  // 4. Negative access control: Admin A must not be able to list Admin B's
  //    sessions. Using the main connection (still carrying Admin A's token),
  //    attempt to query Admin B's sessions and expect an error.
  await TestValidator.error(
    "Admin A must not list Admin B's sessions",
    async () => {
      const crossRequest = {
        // empty filter; same as own-session search
      } satisfies IDiscussionBoardAdminuserSession.IRequest;

      await api.functional.discussionBoard.adminUser.adminUsers.sessions.index(
        connection,
        {
          adminUserId: adminB.id,
          body: crossRequest,
        },
      );
    },
  );
}
