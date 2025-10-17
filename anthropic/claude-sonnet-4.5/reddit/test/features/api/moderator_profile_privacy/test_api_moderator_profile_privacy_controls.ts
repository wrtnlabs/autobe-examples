import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test moderator profile customization workflow.
 *
 * This test validates that moderators can update their own profile information
 * including biography and avatar URL through the profile update endpoint. The
 * test workflow:
 *
 * 1. Create a new moderator account via registration
 * 2. Update the moderator's own profile with custom biography and avatar URL
 * 3. Validate that the profile information is successfully updated in the response
 * 4. Verify that the profile data persists correctly with proper user
 *    identification
 * 5. Confirm that moderators can manage their own profile customization
 *
 * This demonstrates the moderator's ability to personalize their profile with
 * biographical information and custom avatar images.
 */
export async function test_api_moderator_profile_privacy_controls(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });

  typia.assert(moderator);

  // Validate moderator creation response
  TestValidator.equals(
    "moderator username matches input",
    moderator.username,
    moderatorData.username,
  );
  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorData.email,
  );

  // Step 2: Update moderator's own profile with biography and avatar
  const profileUpdateData = {
    profile_bio: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    avatar_url: typia.random<string & tags.Format<"url">>(),
  } satisfies IRedditLikeUser.IProfileUpdate;

  const updatedProfile: IRedditLikeUser.IProfile =
    await api.functional.redditLike.moderator.users.profile.update(connection, {
      userId: moderator.id,
      body: profileUpdateData,
    });

  typia.assert(updatedProfile);

  // Step 3: Validate the profile update response
  TestValidator.equals(
    "updated profile user ID matches moderator ID",
    updatedProfile.id,
    moderator.id,
  );

  TestValidator.equals(
    "updated profile username matches moderator username",
    updatedProfile.username,
    moderator.username,
  );

  // Step 4: Verify profile bio and avatar URL were updated correctly
  TestValidator.equals(
    "profile bio was updated",
    updatedProfile.profile_bio,
    profileUpdateData.profile_bio,
  );

  TestValidator.equals(
    "avatar URL was updated",
    updatedProfile.avatar_url,
    profileUpdateData.avatar_url,
  );
}
