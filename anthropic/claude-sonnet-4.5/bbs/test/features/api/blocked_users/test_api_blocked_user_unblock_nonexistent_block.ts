import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the unblock operation when attempting to remove a blocking relationship
 * that does not exist.
 *
 * This test validates error handling when a user tries to unblock someone they
 * have not actually blocked. The scenario ensures the system properly rejects
 * invalid unblock operations and maintains data integrity.
 *
 * Test workflow:
 *
 * 1. Create first member account (would-be blocker)
 * 2. Create second member account (would-be blocked user)
 * 3. Attempt to unblock the second user without creating a block relationship
 *    first
 * 4. Verify the operation returns an appropriate error response
 * 5. Confirm the error indicates no blocking relationship exists
 */
export async function test_api_blocked_user_unblock_nonexistent_block(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (would-be blocker)
  const firstMemberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: firstMemberData,
    });
  typia.assert(firstMember);

  // Step 2: Create second member account (would-be blocked user)
  const secondMemberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const secondMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: secondMemberData,
    });
  typia.assert(secondMember);

  // Step 3: Attempt to unblock the second user without creating a block relationship first
  // This should fail with an appropriate error
  await TestValidator.error(
    "unblock should fail when no blocking relationship exists",
    async () => {
      await api.functional.discussionBoard.member.users.blockedUsers.erase(
        connection,
        {
          userId: firstMember.id,
          blockedUserId: secondMember.id,
        },
      );
    },
  );
}
