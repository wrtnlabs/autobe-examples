import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test moderator profile update with explicit null values to remove optional
 * fields.
 *
 * This scenario validates that a moderator can remove optional profile
 * customizations by setting fields to null. The test creates a moderator with
 * populated display_name and avatar_url, then updates the profile with explicit
 * null values for these fields, and verifies that the response shows these
 * fields as null (reverting to default behavior where username is shown instead
 * of display_name and default avatar is used). This validates the field removal
 * capability that allows moderators to reset their profile to a minimal state
 * by removing personalization.
 *
 * Steps:
 *
 * 1. Create a moderator account with customized profile (display_name, avatar_url)
 * 2. Verify the initial profile has all customization fields populated
 * 3. Update the profile with explicit null values for display_name and avatar_url
 * 4. Verify the response shows these fields as null, confirming successful removal
 */
export async function test_api_moderator_profile_update_null_field_handling(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account with fully customized profile
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const initialNickname = RandomGenerator.name();
  const initialDisplayName = RandomGenerator.name(2);
  const initialAvatarUrl = typia.random<string & tags.Format<"uri">>();

  const createdModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: initialNickname,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(createdModerator);

  // Step 2: Update profile to add customizations first
  const customizedProfile: IRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.moderator.moderators.update(
      connection,
      {
        username: createdModerator.username,
        body: {
          display_name: initialDisplayName,
          avatar_url: initialAvatarUrl,
        } satisfies IRedditCommunityCommunityModerator.IUpdate,
      },
    );
  typia.assert(customizedProfile);

  // Verify customizations were applied
  TestValidator.equals(
    "display name should be set",
    customizedProfile.display_name,
    initialDisplayName,
  );
  TestValidator.equals(
    "avatar url should be set",
    customizedProfile.avatar_url,
    initialAvatarUrl,
  );

  // Step 3: Update profile with explicit null values to remove customizations
  const resetProfile: IRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.moderator.moderators.update(
      connection,
      {
        username: createdModerator.username,
        body: {
          display_name: null,
          avatar_url: null,
        } satisfies IRedditCommunityCommunityModerator.IUpdate,
      },
    );
  typia.assert(resetProfile);

  // Step 4: Verify all customization fields are now null
  TestValidator.equals(
    "display name should be null after reset",
    resetProfile.display_name,
    null,
  );
  TestValidator.equals(
    "avatar url should be null after reset",
    resetProfile.avatar_url,
    null,
  );

  // Verify core identity fields remain unchanged
  TestValidator.equals(
    "username should remain unchanged",
    resetProfile.username,
    createdModerator.username,
  );
  TestValidator.equals(
    "moderator id should remain unchanged",
    resetProfile.id,
    createdModerator.id,
  );
}
