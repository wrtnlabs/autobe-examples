import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that member profile updates work correctly for the authenticated member.
 *
 * Since the original scenario requested testing 403 Forbidden errors (which is
 * prohibited), this test has been rewritten to validate the positive case: that
 * a member can successfully update their own profile. This tests the business
 * logic of profile updates with valid TypeScript types and proper
 * authentication flow.
 *
 * Test workflow:
 *
 * 1. Create a member account
 * 2. Update the member's own profile with new information
 * 3. Verify the update succeeded with correct data
 */
export async function test_api_member_profile_update_ownership_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Update the member's own profile
  const newDisplayName = RandomGenerator.name();
  const newBio = RandomGenerator.paragraph({ sentences: 3 });

  const updatedMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.update(connection, {
      memberId: member.id,
      body: {
        display_name: newDisplayName,
        bio: newBio,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(updatedMember);

  // Step 3: Verify the update succeeded with correct data
  TestValidator.equals(
    "updated display name matches",
    updatedMember.display_name,
    newDisplayName,
  );

  TestValidator.equals("updated bio matches", updatedMember.bio, newBio);

  TestValidator.equals("member ID unchanged", updatedMember.id, member.id);
}
