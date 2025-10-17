import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test that moderators can update their own user profile information.
 *
 * This test validates the complete workflow of a moderator updating their own
 * profile. It starts by creating a new moderator account through registration,
 * then uses that authenticated moderator session to update their profile with
 * custom biography and avatar URL.
 *
 * The test confirms that:
 *
 * 1. Moderator registration succeeds and provides authentication
 * 2. Profile update succeeds when using the moderator's own userId
 * 3. Updated profile reflects the changes in biography and avatar
 * 4. Response structure matches the expected IRedditLikeUser.IProfile type
 *
 * Business Context: Moderators have the same profile editing capabilities as
 * regular members for their own profiles. This ensures moderators can maintain
 * their public identity and provide context about themselves to the community
 * they moderate.
 */
export async function test_api_moderator_own_profile_update(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorCredentials = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCredentials,
    });
  typia.assert(moderator);

  // Step 2: Prepare profile update data
  const profileUpdate = {
    profile_bio: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    avatar_url: typia.random<string & tags.Format<"url">>(),
  } satisfies IRedditLikeUser.IProfileUpdate;

  // Step 3: Update the moderator's own profile
  const updatedProfile: IRedditLikeUser.IProfile =
    await api.functional.redditLike.moderator.users.profile.update(connection, {
      userId: moderator.id,
      body: profileUpdate,
    });
  typia.assert(updatedProfile);

  // Step 4: Validate the updated profile contains the new values
  TestValidator.equals(
    "updated profile bio matches input",
    updatedProfile.profile_bio,
    profileUpdate.profile_bio,
  );

  TestValidator.equals(
    "updated avatar URL matches input",
    updatedProfile.avatar_url,
    profileUpdate.avatar_url,
  );

  // Step 5: Validate the profile structure
  TestValidator.equals(
    "profile user ID matches moderator ID",
    updatedProfile.id,
    moderator.id,
  );

  TestValidator.equals(
    "profile username matches moderator username",
    updatedProfile.username,
    moderator.username,
  );
}
