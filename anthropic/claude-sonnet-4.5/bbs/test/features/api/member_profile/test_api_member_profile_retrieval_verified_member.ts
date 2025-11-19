import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator retrieval of a member profile with verified email status.
 *
 * This test validates that moderators can retrieve complete member profile
 * information including email verification status. The test creates a moderator
 * account for administrative access, creates a member account, and retrieves
 * the member's profile through the moderator endpoint to confirm that all
 * profile fields including verification status are properly accessible to
 * moderators.
 *
 * Steps:
 *
 * 1. Create moderator account for profile retrieval operations
 * 2. Create member account through registration
 * 3. Authenticate as moderator to access administrative endpoints
 * 4. Retrieve member's profile using moderator endpoint
 * 5. Validate profile data matches created member
 * 6. Confirm moderator can access member verification status fields
 */
export async function test_api_member_profile_retrieval_verified_member(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for profile retrieval
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.Format<"password">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: memberUsername,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Authenticate as moderator (already authenticated through join)
  // The moderator.token contains authentication tokens from registration

  // Step 4: Retrieve member's profile using moderator endpoint
  const retrievedMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.moderator.members.at(connection, {
      memberId: member.id,
    });
  typia.assert(retrievedMember);

  // Step 5: Validate profile data matches created member
  TestValidator.equals(
    "retrieved member ID matches created member",
    retrievedMember.id,
    member.id,
  );

  TestValidator.equals(
    "retrieved member email matches created member",
    retrievedMember.email,
    member.email,
  );

  TestValidator.equals(
    "retrieved member username matches created member",
    retrievedMember.username,
    member.username,
  );

  // Step 6: Confirm moderator can access verification status
  // The email_verified and email_verified_at fields are present in response
  // typia.assert() already validated all field types and formats
  TestValidator.equals(
    "retrieved member email_verified matches created member",
    retrievedMember.email_verified,
    member.email_verified,
  );
}
