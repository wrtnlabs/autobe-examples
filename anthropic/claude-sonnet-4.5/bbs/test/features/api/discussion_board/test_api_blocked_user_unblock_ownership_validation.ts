import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBlockedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBlockedUser";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that users cannot remove other users' blocking relationships, validating
 * the ownership security control.
 *
 * This test ensures that only the blocker themselves can remove their own
 * blocks, preventing unauthorized manipulation of blocking relationships by
 * third parties.
 *
 * Test steps:
 *
 * 1. Create member A (blocker) via join operation
 * 2. Create member B (blocked user) via join operation
 * 3. Member A creates a blocking relationship against member B
 * 4. Create member C (unauthorized user) via join operation
 * 5. Attempt to unblock using member C's authentication (unauthorized)
 * 6. Verify the operation is rejected with authorization error
 * 7. Verify the blocking relationship remains intact
 */
export async function test_api_blocked_user_unblock_ownership_validation(
  connection: api.IConnection,
) {
  // Step 1: Create member A (blocker)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const memberAData = {
    username: RandomGenerator.alphaNumeric(10),
    email: memberAEmail,
    password: memberAPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const memberA: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberAData });
  typia.assert(memberA);

  // Step 2: Create member B (blocked user)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const memberBData = {
    username: RandomGenerator.alphaNumeric(10),
    email: memberBEmail,
    password: memberBPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const memberB: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberBData });
  typia.assert(memberB);

  // Step 3: Switch back to member A's authentication and create blocking relationship
  await api.functional.auth.member.join(connection, { body: memberAData });

  const blockData = {
    blocked_user_id: memberB.id,
    reason: "Test blocking relationship for ownership validation",
  } satisfies IDiscussionBoardBlockedUser.ICreate;

  const blockRelationship: IDiscussionBoardBlockedUser =
    await api.functional.discussionBoard.member.users.blockedUsers.create(
      connection,
      {
        userId: memberA.id,
        body: blockData,
      },
    );
  typia.assert(blockRelationship);

  // Step 4: Create member C (unauthorized user)
  const memberCEmail = typia.random<string & tags.Format<"email">>();
  const memberCPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const memberCData = {
    username: RandomGenerator.alphaNumeric(10),
    email: memberCEmail,
    password: memberCPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const memberC: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberCData });
  typia.assert(memberC);

  // Step 5: Attempt to remove the block using member C's authentication (should fail)
  await TestValidator.error(
    "member C cannot remove member A's blocking relationship",
    async () => {
      await api.functional.discussionBoard.member.users.blockedUsers.erase(
        connection,
        {
          userId: memberA.id,
          blockedUserId: memberB.id,
        },
      );
    },
  );
}
