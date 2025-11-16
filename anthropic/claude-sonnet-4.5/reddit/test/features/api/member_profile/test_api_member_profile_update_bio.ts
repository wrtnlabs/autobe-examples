import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that an authenticated member can update their bio field with
 * markdown-supported text.
 *
 * This test validates the member profile bio update functionality, ensuring
 * that members can write self-descriptions up to 500 characters with basic
 * markdown formatting. The test authenticates as a member, updates the bio with
 * markdown content, and verifies the bio is correctly stored and retrievable.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a new member account
 * 2. Update the member's bio with markdown-formatted text
 * 3. Verify the updated bio is correctly reflected in the response
 * 4. Validate response structure and data integrity
 */
export async function test_api_member_profile_update_bio(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);
  const memberPassword = RandomGenerator.alphaNumeric(16);

  const registrationData = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const authenticatedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(authenticatedMember);

  // Verify initial authentication succeeded
  TestValidator.equals(
    "registered username matches",
    authenticatedMember.username,
    memberUsername,
  );
  TestValidator.equals(
    "registered email matches",
    authenticatedMember.email,
    memberEmail,
  );

  // Step 2: Update the member's bio with markdown-formatted text
  const markdownBio = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 8,
  });

  // Ensure bio is within 500 character limit
  const bioContent =
    markdownBio.length > 500
      ? markdownBio.substring(0, 497) + "..."
      : markdownBio;

  const updateData = {
    bio: bioContent,
  } satisfies IRedditCommunityGuest.IUpdate;

  const updatedProfile: IRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.member.members.update(connection, {
      username: authenticatedMember.username,
      body: updateData,
    });
  typia.assert(updatedProfile);

  // Step 3: Verify the updated bio is correctly reflected in the response
  TestValidator.equals(
    "updated bio matches submitted content",
    updatedProfile.bio,
    bioContent,
  );

  // Step 4: Validate response structure and data integrity
  TestValidator.equals(
    "member ID remains unchanged",
    updatedProfile.id,
    authenticatedMember.id,
  );
  TestValidator.equals(
    "username remains unchanged",
    updatedProfile.username,
    authenticatedMember.username,
  );
  TestValidator.equals(
    "display name remains unchanged",
    updatedProfile.display_name,
    authenticatedMember.display_name,
  );
  TestValidator.equals(
    "post karma unchanged",
    updatedProfile.post_karma,
    authenticatedMember.post_karma,
  );
  TestValidator.equals(
    "comment karma unchanged",
    updatedProfile.comment_karma,
    authenticatedMember.comment_karma,
  );
}
