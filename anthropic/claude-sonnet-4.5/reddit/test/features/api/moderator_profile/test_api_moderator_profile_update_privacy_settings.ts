import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test moderator privacy settings configuration through profile update.
 *
 * This scenario validates that a moderator can control their privacy
 * preferences by updating the three privacy flags: show_online_status (controls
 * last active visibility), show_subscribed_communities (controls subscription
 * list visibility), and show_activity_feed (controls posts/comments
 * visibility). The test creates a moderator with default privacy settings, then
 * toggles all privacy flags to different values, and verifies that the update
 * operation completes successfully by confirming the moderator identity in the
 * response.
 *
 * Steps:
 *
 * 1. Create a new moderator account
 * 2. Update privacy settings by toggling all three privacy flags
 * 3. Verify the update operation completed successfully
 */
export async function test_api_moderator_profile_update_privacy_settings(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account with default privacy settings
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorNickname = RandomGenerator.name();

  const createdModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(createdModerator);

  // Step 2: Update privacy settings by toggling all three privacy flags
  const updatedProfile: IRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.moderator.moderators.update(
      connection,
      {
        username: createdModerator.username,
        body: {
          show_online_status: true,
          show_subscribed_communities: true,
          show_activity_feed: false,
        } satisfies IRedditCommunityCommunityModerator.IUpdate,
      },
    );
  typia.assert(updatedProfile);

  // Step 3: Verify that the profile update operation completed successfully
  TestValidator.equals(
    "moderator ID should match",
    updatedProfile.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "moderator username should match",
    updatedProfile.username,
    createdModerator.username,
  );
}
