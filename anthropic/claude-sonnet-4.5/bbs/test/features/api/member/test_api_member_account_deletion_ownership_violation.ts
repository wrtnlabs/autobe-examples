import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that member accounts cannot delete other members' accounts due to
 * ownership verification.
 *
 * This test validates the critical security requirement that members can only
 * delete their own accounts and cannot delete accounts belonging to other
 * members. The system must enforce ownership verification to prevent
 * unauthorized account deletions.
 *
 * Test workflow:
 *
 * 1. Create first member account (Member A) through registration
 * 2. Create second member account (Member B) through registration
 * 3. At this point, Member B is authenticated (join automatically sets their
 *    token)
 * 4. Attempt to delete Member A's account while authenticated as Member B
 * 5. Verify the deletion attempt fails with authorization error
 * 6. Confirm ownership verification properly blocked the unauthorized deletion
 */
export async function test_api_member_account_deletion_ownership_violation(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (Member A)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAData = {
    email: memberAEmail,
    password: typia.random<string & tags.Format<"password">>(),
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const memberA: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberAData,
    });
  typia.assert(memberA);

  // Step 2: Create second member account (Member B)
  // This join operation automatically sets Member B's token in connection.headers
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBData = {
    email: memberBEmail,
    password: typia.random<string & tags.Format<"password">>(),
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const memberB: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBData,
    });
  typia.assert(memberB);

  // Step 3: At this point, Member B is authenticated
  // The SDK automatically set Member B's token during their registration

  // Step 4: Attempt to delete Member A's account while authenticated as Member B
  // This should fail because Member B does not own Member A's account
  await TestValidator.error(
    "member cannot delete another member's account",
    async () => {
      await api.functional.discussionBoard.member.members.erase(connection, {
        memberId: memberA.id,
      });
    },
  );

  // Test passes if the deletion attempt was properly rejected
  // The ownership verification should prevent Member B from deleting Member A's account
}
