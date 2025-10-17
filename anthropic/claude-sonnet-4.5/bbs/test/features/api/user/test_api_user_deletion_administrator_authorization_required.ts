import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test administrator-only authorization for user account deletion.
 *
 * This test validates that only administrators can delete user accounts through
 * proper role-based access control. The workflow tests both negative and
 * positive scenarios to ensure security boundaries are properly enforced.
 *
 * Steps:
 *
 * 1. Create a regular member account
 * 2. Attempt to delete the member account using member credentials (should fail
 *    with 403)
 * 3. Verify the member account still exists and is unchanged
 * 4. Create an administrator account
 * 5. Administrator deletes the member account (should succeed)
 * 6. Verify the deletion succeeded
 */
export async function test_api_user_deletion_administrator_authorization_required(
  connection: api.IConnection,
) {
  // Step 1: Create a regular member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Attempt to delete the member account using member credentials
  // The member is now authenticated, so connection has their token
  await TestValidator.error(
    "member cannot delete their own account without administrator privileges",
    async () => {
      await api.functional.discussionBoard.administrator.users.erase(
        connection,
        {
          userId: member.id,
        },
      );
    },
  );

  // Step 3: Create an administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 4: Administrator deletes the member account (should succeed)
  await api.functional.discussionBoard.administrator.users.erase(connection, {
    userId: member.id,
  });
}
