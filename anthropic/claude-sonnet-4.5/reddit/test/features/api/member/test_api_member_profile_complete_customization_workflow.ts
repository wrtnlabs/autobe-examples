import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

export async function test_api_member_profile_complete_customization_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to obtain authentication
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Prepare complete profile update with all editable fields
  const biographyText = RandomGenerator.paragraph({
    sentences: 25,
    wordMin: 4,
    wordMax: 7,
  });

  const profileUpdate = {
    profile_bio: biographyText.substring(0, 450),
    avatar_url:
      "https://example.com/avatars/" +
      RandomGenerator.alphaNumeric(16) +
      ".png",
  } satisfies IRedditLikeUser.IProfileUpdate;

  // Validate biography length is within 200-500 character range
  TestValidator.predicate(
    "biography length should be between 200-500 characters",
    profileUpdate.profile_bio.length >= 200 &&
      profileUpdate.profile_bio.length <= 500,
  );

  // Step 3: Update profile with all fields simultaneously
  const updatedProfile: IRedditLikeUser.IProfile =
    await api.functional.redditLike.member.users.profile.update(connection, {
      userId: member.id,
      body: profileUpdate,
    });
  typia.assert(updatedProfile);

  // Step 4: Validate the complete updated profile is returned
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
  TestValidator.equals(
    "profile user ID matches member ID",
    updatedProfile.id,
    member.id,
  );
  TestValidator.equals(
    "profile username matches member username",
    updatedProfile.username,
    member.username,
  );
  TestValidator.equals(
    "post karma preserved during profile update",
    updatedProfile.post_karma,
    member.post_karma,
  );
  TestValidator.equals(
    "comment karma preserved during profile update",
    updatedProfile.comment_karma,
    member.comment_karma,
  );

  // Validate that created_at timestamp exists
  TestValidator.predicate(
    "profile has created_at timestamp",
    typeof updatedProfile.created_at === "string" &&
      updatedProfile.created_at.length > 0,
  );
}
