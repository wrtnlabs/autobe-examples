import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBlockedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBlockedUser";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the complete workflow for creating a new user blocking relationship.
 *
 * This test validates the blocking feature where one member blocks another
 * member on the discussion board platform. The blocking mechanism is
 * asymmetric, meaning the blocker no longer sees the blocked user's content,
 * but the blocked user can still see the blocker's content.
 *
 * Workflow:
 *
 * 1. Create the blocker member account through registration
 * 2. Create the target member account to be blocked through registration
 * 3. Authenticate as the blocker and create the blocking relationship
 * 4. Verify the blocking relationship is successfully created
 * 5. Test business rule validations (self-blocking prevention, duplicate blocking)
 */
export async function test_api_blocking_relationship_creation_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create the blocker member account
  const blockerEmail = typia.random<string & tags.Format<"email">>();
  const blockerUsername = RandomGenerator.alphaNumeric(8);
  const blockerPassword = RandomGenerator.alphaNumeric(12);
  const blockerDisplayName = RandomGenerator.name();

  const blocker = await api.functional.auth.member.join(connection, {
    body: {
      username: blockerUsername,
      email: blockerEmail,
      password: blockerPassword,
      display_name: blockerDisplayName,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(blocker);

  // Step 2: Create the target member account to be blocked
  const blockedEmail = typia.random<string & tags.Format<"email">>();
  const blockedUsername = RandomGenerator.alphaNumeric(8);
  const blockedPassword = RandomGenerator.alphaNumeric(12);
  const blockedDisplayName = RandomGenerator.name();

  const blocked = await api.functional.auth.member.join(connection, {
    body: {
      username: blockedUsername,
      email: blockedEmail,
      password: blockedPassword,
      display_name: blockedDisplayName,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(blocked);

  // Step 3: Authenticate as the blocker and create blocking relationship
  const blockReason = RandomGenerator.paragraph({ sentences: 3 });
  const blockingRelationship =
    await api.functional.discussionBoard.member.users.blockedUsers.create(
      connection,
      {
        userId: blocker.id,
        body: {
          blocked_user_id: blocked.id,
          reason: blockReason,
        } satisfies IDiscussionBoardBlockedUser.ICreate,
      },
    );
  typia.assert(blockingRelationship);

  // Step 4: Verify the blocking relationship details
  TestValidator.equals(
    "blocker ID matches",
    blockingRelationship.blocker.id,
    blocker.id,
  );
  TestValidator.equals(
    "blocker username matches",
    blockingRelationship.blocker.username,
    blockerUsername,
  );
  TestValidator.equals(
    "blocked user ID matches",
    blockingRelationship.blocked.id,
    blocked.id,
  );
  TestValidator.equals(
    "blocked user username matches",
    blockingRelationship.blocked.username,
    blockedUsername,
  );
  TestValidator.equals(
    "block reason matches",
    blockingRelationship.reason,
    blockReason,
  );

  // Step 5: Test business rule - cannot block the same user twice (duplicate prevention)
  await TestValidator.error(
    "duplicate blocking relationship should fail",
    async () => {
      await api.functional.discussionBoard.member.users.blockedUsers.create(
        connection,
        {
          userId: blocker.id,
          body: {
            blocked_user_id: blocked.id,
            reason: "Attempting duplicate block",
          } satisfies IDiscussionBoardBlockedUser.ICreate,
        },
      );
    },
  );

  // Step 6: Test business rule - users cannot block themselves
  await TestValidator.error("self-blocking should fail", async () => {
    await api.functional.discussionBoard.member.users.blockedUsers.create(
      connection,
      {
        userId: blocker.id,
        body: {
          blocked_user_id: blocker.id,
          reason: "Attempting self-block",
        } satisfies IDiscussionBoardBlockedUser.ICreate,
      },
    );
  });

  // Step 7: Test creating a block without optional reason field
  const thirdMemberEmail = typia.random<string & tags.Format<"email">>();
  const thirdMemberUsername = RandomGenerator.alphaNumeric(8);
  const thirdMember = await api.functional.auth.member.join(connection, {
    body: {
      username: thirdMemberUsername,
      email: thirdMemberEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(thirdMember);

  const blockWithoutReason =
    await api.functional.discussionBoard.member.users.blockedUsers.create(
      connection,
      {
        userId: blocker.id,
        body: {
          blocked_user_id: thirdMember.id,
        } satisfies IDiscussionBoardBlockedUser.ICreate,
      },
    );
  typia.assert(blockWithoutReason);
  TestValidator.equals(
    "block without reason has null reason",
    blockWithoutReason.reason,
    null,
  );
}
