import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test moderator profile display customization including display name, bio, and
 * avatar updates.
 *
 * This test validates that a moderator can personalize their public profile
 * presentation by updating display name (up to 50 characters with Unicode
 * support), bio (up to 500 characters with markdown support), and avatar URL.
 * The test creates a moderator account with default or null values for these
 * fields, then updates them with realistic personalized content, and verifies
 * all changes are reflected in the response.
 *
 * Workflow:
 *
 * 1. Create a new moderator account (establishes authentication context)
 * 2. Update the moderator profile with customized display name, bio, and avatar
 *    URL
 * 3. Validate that all updated fields are correctly returned in the response
 */
export async function test_api_moderator_profile_update_display_customization(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";
  const moderatorNickname = RandomGenerator.name();

  const registrationBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    nickname: moderatorNickname,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const createdModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationBody,
    });

  typia.assert(createdModerator);

  // Step 2: Update the moderator profile with display customization
  const customDisplayName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const customBio = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const customAvatarUrl = typia.random<string & tags.Format<"uri">>();

  const updateBody = {
    display_name: customDisplayName,
    bio: customBio,
    avatar_url: customAvatarUrl,
  } satisfies IRedditCommunityCommunityModerator.IUpdate;

  const updatedProfile: IRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.moderator.moderators.update(
      connection,
      {
        username: createdModerator.username,
        body: updateBody,
      },
    );

  typia.assert(updatedProfile);

  // Step 3: Validate that all updated fields are correctly returned
  TestValidator.equals(
    "display name should match the updated value",
    updatedProfile.display_name,
    customDisplayName,
  );

  TestValidator.equals(
    "avatar URL should match the updated value",
    updatedProfile.avatar_url,
    customAvatarUrl,
  );

  // Note: bio is not included in ISummary response type, so we only validate fields present in the response
  TestValidator.equals(
    "moderator ID should remain unchanged",
    updatedProfile.id,
    createdModerator.id,
  );

  TestValidator.equals(
    "username should remain unchanged",
    updatedProfile.username,
    createdModerator.username,
  );
}
