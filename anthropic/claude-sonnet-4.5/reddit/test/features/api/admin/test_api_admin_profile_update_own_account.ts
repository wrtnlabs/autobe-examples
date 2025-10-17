import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test that an administrator can successfully update their own profile.
 *
 * This test validates the complete profile update workflow where an admin
 * creates their account, gets authenticated, and then updates their profile
 * information including biography and avatar URL.
 *
 * Steps:
 *
 * 1. Register a new admin account (automatically authenticates)
 * 2. Update the admin's own profile with new bio and avatar
 * 3. Verify the profile update was successful with correct data
 */
export async function test_api_admin_profile_update_own_account(
  connection: api.IConnection,
) {
  // Step 1: Create admin account (auto-authenticates)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const createdAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(createdAdmin);

  // Step 2: Update own profile
  const newBio = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const newAvatarUrl = typia.random<string & tags.Format<"url">>();

  const updatedProfile =
    await api.functional.redditLike.admin.users.profile.update(connection, {
      userId: createdAdmin.id,
      body: {
        profile_bio: newBio,
        avatar_url: newAvatarUrl,
      } satisfies IRedditLikeUser.IProfileUpdate,
    });
  typia.assert(updatedProfile);

  // Step 3: Verify profile update
  TestValidator.equals(
    "profile ID matches admin ID",
    updatedProfile.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "username remains unchanged",
    updatedProfile.username,
    createdAdmin.username,
  );
  TestValidator.equals(
    "profile bio updated correctly",
    updatedProfile.profile_bio,
    newBio,
  );
  TestValidator.equals(
    "avatar URL updated correctly",
    updatedProfile.avatar_url,
    newAvatarUrl,
  );
}
