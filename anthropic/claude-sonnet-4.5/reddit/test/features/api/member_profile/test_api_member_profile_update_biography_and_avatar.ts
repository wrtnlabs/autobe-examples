import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test member profile update with biography and avatar customization.
 *
 * This test validates the complete profile customization workflow where an
 * authenticated member updates their profile biography and avatar image. The
 * test creates a new member account through registration, then uses that
 * authenticated session to update the member's profile with custom biography
 * and avatar URL, verifying that changes are persisted correctly.
 *
 * Workflow steps:
 *
 * 1. Register a new member account to obtain authentication and user ID
 * 2. Update the member's profile with custom biography and avatar URL
 * 3. Validate that the returned profile reflects the updated values
 * 4. Verify all profile fields are present and biography/avatar match submission
 */
export async function test_api_member_profile_update_biography_and_avatar(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const registrationData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "Aa1!",
  } satisfies IRedditLikeMember.ICreate;

  const authorizedMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  typia.assert(authorizedMember);

  // Step 2: Prepare profile update data
  const profileUpdateData = {
    profile_bio: RandomGenerator.paragraph({
      sentences: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    avatar_url: typia.random<string & tags.Format<"url">>(),
  } satisfies IRedditLikeUser.IProfileUpdate;

  // Step 3: Update member profile
  const updatedProfile: IRedditLikeUser.IProfile =
    await api.functional.redditLike.member.users.profile.update(connection, {
      userId: authorizedMember.id,
      body: profileUpdateData,
    });

  typia.assert(updatedProfile);

  // Step 4: Validate the updated profile
  TestValidator.equals(
    "updated profile bio matches submission",
    updatedProfile.profile_bio,
    profileUpdateData.profile_bio,
  );

  TestValidator.equals(
    "updated avatar URL matches submission",
    updatedProfile.avatar_url,
    profileUpdateData.avatar_url,
  );

  TestValidator.equals(
    "profile user ID matches registered member",
    updatedProfile.id,
    authorizedMember.id,
  );

  TestValidator.equals(
    "profile username matches registered member",
    updatedProfile.username,
    authorizedMember.username,
  );
}
