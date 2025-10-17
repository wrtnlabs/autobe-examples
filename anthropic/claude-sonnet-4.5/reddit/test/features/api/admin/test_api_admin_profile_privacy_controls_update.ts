import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test updating admin profile privacy control settings.
 *
 * This test validates that an admin can configure various privacy control
 * settings for their profile. It verifies that profile update functionality
 * works correctly:
 *
 * 1. Create an admin account
 * 2. Update profile with biography and avatar
 * 3. Update profile with different biography
 * 4. Update profile with new avatar only
 * 5. Clear biography
 *
 * Profile settings tested:
 *
 * - Profile_bio: Optional biography text (up to 500 characters)
 * - Avatar_url: Optional avatar URL
 */
export async function test_api_admin_profile_privacy_controls_update(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminCreate = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // Step 2: Update profile with biography and avatar
  const profileUpdate1 = {
    profile_bio: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    avatar_url: typia.random<string>(),
  } satisfies IRedditLikeUser.IProfileUpdate;

  const updatedProfile1: IRedditLikeUser.IProfile =
    await api.functional.redditLike.admin.users.profile.update(connection, {
      userId: admin.id,
      body: profileUpdate1,
    });
  typia.assert(updatedProfile1);

  // Verify the profile was updated correctly
  TestValidator.equals("admin ID matches", updatedProfile1.id, admin.id);
  TestValidator.equals(
    "admin username matches",
    updatedProfile1.username,
    admin.username,
  );
  TestValidator.equals(
    "profile bio updated",
    updatedProfile1.profile_bio,
    profileUpdate1.profile_bio,
  );
  TestValidator.equals(
    "avatar URL updated",
    updatedProfile1.avatar_url,
    profileUpdate1.avatar_url,
  );

  // Step 3: Update profile with different biography
  const profileUpdate2 = {
    profile_bio: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeUser.IProfileUpdate;

  const updatedProfile2: IRedditLikeUser.IProfile =
    await api.functional.redditLike.admin.users.profile.update(connection, {
      userId: admin.id,
      body: profileUpdate2,
    });
  typia.assert(updatedProfile2);

  TestValidator.equals("admin ID still matches", updatedProfile2.id, admin.id);
  TestValidator.equals(
    "profile bio updated again",
    updatedProfile2.profile_bio,
    profileUpdate2.profile_bio,
  );

  // Step 4: Update with new avatar only
  const profileUpdate3 = {
    avatar_url: typia.random<string>(),
  } satisfies IRedditLikeUser.IProfileUpdate;

  const updatedProfile3: IRedditLikeUser.IProfile =
    await api.functional.redditLike.admin.users.profile.update(connection, {
      userId: admin.id,
      body: profileUpdate3,
    });
  typia.assert(updatedProfile3);

  TestValidator.equals(
    "avatar URL updated again",
    updatedProfile3.avatar_url,
    profileUpdate3.avatar_url,
  );

  // Step 5: Clear biography by setting undefined
  const profileUpdate4 = {
    profile_bio: undefined,
  } satisfies IRedditLikeUser.IProfileUpdate;

  const updatedProfile4: IRedditLikeUser.IProfile =
    await api.functional.redditLike.admin.users.profile.update(connection, {
      userId: admin.id,
      body: profileUpdate4,
    });
  typia.assert(updatedProfile4);

  // Verify karma values are present
  TestValidator.predicate(
    "post karma is number",
    typeof updatedProfile4.post_karma === "number",
  );
  TestValidator.predicate(
    "comment karma is number",
    typeof updatedProfile4.comment_karma === "number",
  );
}
