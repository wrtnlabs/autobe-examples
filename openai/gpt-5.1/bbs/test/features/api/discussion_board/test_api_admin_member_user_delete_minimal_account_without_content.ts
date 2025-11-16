import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Verify that an admin user can delete a minimal member account with no
 * content.
 *
 * Business context:
 *
 * - Member accounts are stored in discussion_board_memberusers.
 * - The erase endpoint is admin-only and permanently removes the member account
 *   row, while domain content (articles, comments) would be governed
 *   separately.
 * - This scenario uses a freshly registered member that has not yet created any
 *   content, so deletion should succeed cleanly.
 *
 * Steps:
 *
 * 1. Register a new member user via POST /auth/memberUser/join.
 *
 *    - Use IDiscussionBoardMemberUserJoin.IRequest for the request body.
 *    - Capture the returned IDiscussionBoardMemberuser.IAuthorized and its id.
 *    - After this call, the connection will carry a member-user Authorization
 *         header.
 * 2. Attempt to call DELETE /discussionBoard/adminUser/memberUsers/{memberUserId}
 *    while the connection is authenticated as the member user.
 *
 *    - This must fail because the erase endpoint is admin-only.
 *    - Use TestValidator.error with a descriptive title to assert that an error is
 *         thrown.
 * 3. Register an admin user via POST /auth/adminUser/join.
 *
 *    - Use IDiscussionBoardAdminUserJoin.IRequest for the body.
 *    - Capture the returned IDiscussionBoardAdminuser.IAuthorized just for type
 *         safety.
 *    - This call overwrites connection.headers.Authorization with the admin JWT, so
 *         subsequent calls are performed as the adminUser actor.
 * 4. As the admin user, call DELETE
 *    /discussionBoard/adminUser/memberUsers/{memberUserId} using
 *    api.functional.discussionBoard.adminUser.memberUsers.erase.
 *
 *    - Pass the memberUserId from step 1.
 *    - The call returns void; just await it to ensure it completes without throwing.
 * 5. Optionally, call the erase endpoint a second time for the same memberUserId
 *    as admin and assert that it now fails (since the member was already
 *    deleted), again using TestValidator.error. This validates not-found
 *    behavior without checking raw HTTP status codes.
 */
export async function test_api_admin_member_user_delete_minimal_account_without_content(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 8,
    }),
    bio: null,
    location: null,
    ip: null,
    href: "https://frontend.example.com/signup/member",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 2. Verify that a member (non-admin) cannot erase member accounts
  await TestValidator.error(
    "member user cannot erase member accounts",
    async () => {
      await api.functional.discussionBoard.adminUser.memberUsers.erase(
        connection,
        {
          memberUserId,
        },
      );
    },
  );

  // 3. Register an admin user; this will set admin JWT into connection.headers.Authorization
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 12,
    }),
    bio: null,
    ip: null,
    href: "https://frontend.example.com/admin/signup",
    referrer: "https://frontend.example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. As admin, successfully erase the member account
  await api.functional.discussionBoard.adminUser.memberUsers.erase(connection, {
    memberUserId,
  });

  // 5. Subsequent erase attempts for the same member should now fail for admin as well
  await TestValidator.error(
    "admin cannot erase already deleted member account",
    async () => {
      await api.functional.discussionBoard.adminUser.memberUsers.erase(
        connection,
        {
          memberUserId,
        },
      );
    },
  );
}
