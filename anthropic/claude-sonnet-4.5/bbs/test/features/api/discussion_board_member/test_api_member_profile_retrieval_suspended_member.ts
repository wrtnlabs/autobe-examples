import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator retrieval of member profiles.
 *
 * This test validates that moderators can retrieve member profiles for
 * administrative oversight. Since no suspend API is available in the provided
 * endpoints, this test demonstrates the moderator's ability to access complete
 * member information including suspension-related fields (which will have
 * default values for newly created members).
 *
 * Steps:
 *
 * 1. Create moderator account with member retrieval privileges
 * 2. Create member account (will have default suspension status)
 * 3. Retrieve the member's profile as moderator
 * 4. Verify all member fields including suspension status are accessible
 * 5. Verify suspension fields have expected default values (false, null, null)
 */
export async function test_api_member_profile_retrieval_suspended_member(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with member retrieval privileges
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
    username: typia.random<string>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Retrieve the member's profile as moderator
  // Note: Authentication as moderator was already established in Step 1
  const retrievedMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.moderator.members.at(connection, {
      memberId: member.id,
    });
  typia.assert(retrievedMember);

  // Step 4: Verify the retrieved profile contains all expected fields
  TestValidator.equals("member ID matches", retrievedMember.id, member.id);
  TestValidator.equals(
    "member email matches",
    retrievedMember.email,
    member.email,
  );
  TestValidator.equals(
    "member username matches",
    retrievedMember.username,
    member.username,
  );

  // Step 5: Verify suspension-related fields are present and have default values
  // For newly created members, is_suspended should be false
  TestValidator.equals(
    "member is not suspended by default",
    retrievedMember.is_suspended,
    false,
  );

  // Verify suspension reason is null or undefined for non-suspended members
  TestValidator.predicate(
    "suspension reason is null for non-suspended member",
    retrievedMember.suspension_reason === null ||
      retrievedMember.suspension_reason === undefined,
  );

  // Verify suspended_until is null or undefined for non-suspended members
  TestValidator.predicate(
    "suspended until is null for non-suspended member",
    retrievedMember.suspended_until === null ||
      retrievedMember.suspended_until === undefined,
  );

  // Verify email verification status
  TestValidator.equals(
    "email not verified initially",
    retrievedMember.email_verified,
    false,
  );
}
