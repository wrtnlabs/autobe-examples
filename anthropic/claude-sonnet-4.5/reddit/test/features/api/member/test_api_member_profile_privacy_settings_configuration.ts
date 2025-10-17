import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test member profile configuration workflow with bio and avatar updates.
 *
 * This test validates the profile configuration process where a member updates
 * their profile information including biography and avatar URL. The workflow
 * involves:
 *
 * 1. Register a new member account to obtain authentication
 * 2. Update the member's profile with custom biography and avatar
 * 3. Validate that all profile fields are successfully updated and returned
 */
export async function test_api_member_profile_privacy_settings_configuration(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberRegistration = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const authorizedMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });
  typia.assert(authorizedMember);

  // Step 2: Update profile with biography and avatar
  const profileUpdate = {
    profile_bio: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    avatar_url: typia.random<string>(),
  } satisfies IRedditLikeUser.IProfileUpdate;

  const updatedProfile: IRedditLikeUser.IProfile =
    await api.functional.redditLike.member.users.profile.update(connection, {
      userId: authorizedMember.id,
      body: profileUpdate,
    });
  typia.assert(updatedProfile);

  // Step 3: Validate the updated profile
  TestValidator.equals(
    "user ID matches",
    updatedProfile.id,
    authorizedMember.id,
  );

  TestValidator.equals(
    "username matches",
    updatedProfile.username,
    authorizedMember.username,
  );

  TestValidator.equals(
    "profile bio updated",
    updatedProfile.profile_bio,
    profileUpdate.profile_bio,
  );

  TestValidator.equals(
    "avatar URL updated",
    updatedProfile.avatar_url,
    profileUpdate.avatar_url,
  );
}
