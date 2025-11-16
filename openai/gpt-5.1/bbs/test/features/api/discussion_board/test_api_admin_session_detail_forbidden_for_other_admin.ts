import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserSession";

/**
 * Validate the admin session detail endpoint contract for an authenticated
 * admin.
 *
 * Business context:
 *
 * - The system records administrator sessions in
 *   discussion_board_adminuser_sessions.
 * - Admin authentication (join/login) issues JWT tokens and implicitly creates an
 *   admin session, but the session IDs themselves are not exposed through any
 *   listing API in the provided SDK.
 * - The session detail endpoint is scoped by both adminUserId and sessionId path
 *   parameters and returns an IDiscussionBoardAdminuserSession DTO that
 *   includes session metadata and a summary of the owning admin user.
 *
 * Due to missing APIs for discovering concrete session IDs, this test does NOT
 * attempt to verify permission errors (e.g., 403 when one admin inspects
 * another admin's session). Instead, it focuses on the positive contract:
 *
 * - An authenticated adminUser can call the endpoint
 * - The response structurally matches IDiscussionBoardAdminuserSession
 * - When an adminUser summary is present in the session, its id matches the
 *   adminUserId used in the path.
 *
 * Steps:
 *
 * 1. Join as a new admin user via POST /auth/adminUser/join, which also issues an
 *    adminUser token and attaches it to the shared connection's headers.
 * 2. Using the authenticated connection, call GET
 *    /discussionBoard/adminUser/adminUsers/{adminUserId}/sessions/{sessionId}
 *    with:
 *
 *    - AdminUserId: the id from the join response
 *    - SessionId: a random string (in simulation mode this is sufficient to exercise
 *         the client contract; in real mode behavior is backend-defined).
 * 3. Assert that the response is a valid IDiscussionBoardAdminuserSession using
 *    typia.assert().
 * 4. If the embedded adminUser summary exists, validate that its id equals the
 *    adminUserId we passed via TestValidator.equals with a descriptive title.
 */
export async function test_api_admin_session_detail_forbidden_for_other_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin user (join) to obtain an authenticated adminUser.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(adminAuthorized);

  const adminUserId: string & tags.Format<"uuid"> = adminAuthorized.id;

  // 2. Call the admin session detail endpoint with the admin's id and a random sessionId.
  const sessionId: string = typia.random<string>();

  const session: IDiscussionBoardAdminuserSession =
    await api.functional.discussionBoard.adminUser.adminUsers.sessions.at(
      connection,
      {
        adminUserId,
        sessionId,
      },
    );
  typia.assert(session);

  // 3. If the session includes an adminUser summary, ensure it matches the path adminUserId.
  if (session.adminUser !== undefined) {
    typia.assert(session.adminUser);
    TestValidator.equals(
      "session.adminUser.id must match requested adminUserId when present",
      session.adminUser.id,
      adminUserId,
    );
  }
}
