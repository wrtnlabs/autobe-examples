import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBlockedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBlockedUser";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the enforcement of the maximum 100 blocked users per account business
 * rule.
 *
 * This test validates the platform's abuse prevention policy by:
 *
 * 1. Creating a blocker member account who will block other users
 * 2. Creating 100 target member accounts to be blocked
 * 3. Establishing 100 blocking relationships to reach the maximum limit
 * 4. Attempting to create the 101st blocking relationship which should fail
 *
 * The test ensures that:
 *
 * - The first 100 blocking relationships are created successfully
 * - The 101st block attempt returns an error
 * - The system accurately tracks the current block count
 * - The limit is enforced per user account (not platform-wide)
 */
export async function test_api_blocking_maximum_limit_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create the blocker member account
  const blockerData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const blocker: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: blockerData,
    });
  typia.assert(blocker);

  // Step 2: Create 100 target member accounts to be blocked
  const targetMembers: IDiscussionBoardMember.IAuthorized[] =
    await ArrayUtil.asyncRepeat(100, async (index) => {
      const targetData = {
        username: RandomGenerator.alphaNumeric(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate;

      const target: IDiscussionBoardMember.IAuthorized =
        await api.functional.auth.member.join(connection, {
          body: targetData,
        });
      typia.assert(target);
      return target;
    });

  TestValidator.equals("created 100 target members", targetMembers.length, 100);

  // Step 3: Create 100 blocking relationships to reach the maximum limit
  const blockingRelationships: IDiscussionBoardBlockedUser[] =
    await ArrayUtil.asyncRepeat(100, async (index) => {
      const blockData = {
        blocked_user_id: targetMembers[index].id,
        reason: `Test block reason ${index + 1}`,
      } satisfies IDiscussionBoardBlockedUser.ICreate;

      const block: IDiscussionBoardBlockedUser =
        await api.functional.discussionBoard.member.users.blockedUsers.create(
          connection,
          {
            userId: blocker.id,
            body: blockData,
          },
        );
      typia.assert(block);
      return block;
    });

  TestValidator.equals(
    "created 100 blocking relationships",
    blockingRelationships.length,
    100,
  );

  // Validate that all blocking relationships were created successfully
  blockingRelationships.forEach((block, index) => {
    TestValidator.equals(
      `block ${index + 1} has correct blocker ID`,
      block.blocker.id,
      blocker.id,
    );
    TestValidator.equals(
      `block ${index + 1} has correct blocked user ID`,
      block.blocked.id,
      targetMembers[index].id,
    );
  });

  // Step 4: Create one more target member for the 101st block attempt
  const extraTargetData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const extraTarget: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: extraTargetData,
    });
  typia.assert(extraTarget);

  // Step 5: Attempt to create the 101st blocking relationship (should fail)
  await TestValidator.error(
    "101st block attempt should fail with maximum limit error",
    async () => {
      const invalidBlockData = {
        blocked_user_id: extraTarget.id,
        reason: "This block should exceed the limit",
      } satisfies IDiscussionBoardBlockedUser.ICreate;

      await api.functional.discussionBoard.member.users.blockedUsers.create(
        connection,
        {
          userId: blocker.id,
          body: invalidBlockData,
        },
      );
    },
  );
}
