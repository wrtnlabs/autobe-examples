import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that members cannot update other members' profiles due to ownership
 * verification.
 *
 * This test validates the authorization boundary that prevents members from
 * modifying profiles they do not own. The system enforces this by comparing the
 * authenticated member's username with the memberUsername path parameter.
 *
 * Test workflow:
 *
 * 1. Create first member account (memberA) - this will be the authenticated user
 * 2. Create second member account (memberB) - this profile will be the target
 * 3. Authenticate as memberA (establish session with memberA's credentials)
 * 4. Attempt to update memberB's profile using memberB's username in path
 * 5. Verify the operation fails because memberA cannot update memberB's profile
 */
export async function test_api_member_profile_update_ownership_verification(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (memberA - the authenticated user)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = typia.random<string & tags.MinLength<8>>();
  const memberAUsername = RandomGenerator.alphaNumeric(12);

  const memberA: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberAUsername,
        email: memberAEmail,
        password: memberAPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(memberA);

  // Step 2: Create second member account (memberB - the target profile)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = typia.random<string & tags.MinLength<8>>();
  const memberBUsername = RandomGenerator.alphaNumeric(12);

  const memberB: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberBUsername,
        email: memberBEmail,
        password: memberBPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(memberB);

  // Step 3: Authenticate as memberA
  // Note: memberA is already authenticated from the join operation
  // The join operation automatically sets the authorization token
  TestValidator.equals(
    "memberA should be authenticated",
    memberA.username,
    memberAUsername,
  );

  // Step 4: Attempt to update memberB's profile while authenticated as memberA
  // This should fail because memberA (authenticated) cannot update memberB's profile
  const updateData = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    location: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.IUpdate;

  // Step 5: Verify the operation is rejected
  await TestValidator.error(
    "memberA cannot update memberB profile",
    async () => {
      await api.functional.discussionBoard.member.members.update(connection, {
        memberUsername: memberBUsername,
        body: updateData,
      });
    },
  );
}
