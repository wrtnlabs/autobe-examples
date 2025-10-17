import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBlockedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBlockedUser";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that the unblock operation properly enforces authorization rules.
 *
 * This test validates that users can only unblock their own blocking
 * relationships and cannot manipulate other users' blocks. It ensures that
 * third-party users and blocked users themselves cannot remove blocking
 * relationships they don't own.
 *
 * Workflow:
 *
 * 1. Create member A who will create the blocking relationship
 * 2. Create member B who will be blocked by member A
 * 3. Create member C who will attempt unauthorized unblock
 * 4. Member A blocks member B
 * 5. Member C attempts to unblock member B from member A's block list (should
 *    fail)
 * 6. Member B attempts to unblock themselves from member A's block list (should
 *    fail)
 * 7. Member A successfully unblocks member B (should succeed)
 */
export async function test_api_blocked_user_unblock_authorization_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create member A (blocker) using main connection
  const memberAData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const memberA: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberAData,
    });
  typia.assert(memberA);

  // Step 2: Create member B (will be blocked) using separate connection
  const connectionB: api.IConnection = { ...connection, headers: {} };
  const memberBData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const memberB: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connectionB, {
      body: memberBData,
    });
  typia.assert(memberB);

  // Step 3: Create member C (third-party user) using separate connection
  const connectionC: api.IConnection = { ...connection, headers: {} };
  const memberCData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const memberC: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connectionC, {
      body: memberCData,
    });
  typia.assert(memberC);

  // Step 4: Member A blocks member B (using member A's connection)
  const blockData = {
    blocked_user_id: memberB.id,
    reason: "Test blocking for authorization enforcement",
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

  // Step 5: Member C attempts to unblock member B (should fail - unauthorized)
  await TestValidator.error(
    "third-party user cannot unblock other users' blocks",
    async () => {
      await api.functional.discussionBoard.member.blockedUsers.erase(
        connectionC,
        {
          blockedUserId: blockRelationship.id,
        },
      );
    },
  );

  // Step 6: Member B attempts to unblock themselves (should fail - blocked users cannot unblock)
  await TestValidator.error(
    "blocked user cannot unblock themselves",
    async () => {
      await api.functional.discussionBoard.member.blockedUsers.erase(
        connectionB,
        {
          blockedUserId: blockRelationship.id,
        },
      );
    },
  );

  // Step 7: Member A successfully unblocks member B (should succeed)
  await api.functional.discussionBoard.member.blockedUsers.erase(connection, {
    blockedUserId: blockRelationship.id,
  });
}
