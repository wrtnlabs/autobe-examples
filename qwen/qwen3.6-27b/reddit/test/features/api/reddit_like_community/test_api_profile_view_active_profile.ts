import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_profile_create } from "../../../generate/generate_random_reddit_like_community_member_profile_create";
import { prepare_random_reddit_like_community_profile } from "../../../prepare/prepare_random_reddit_like_community_profile";
import { prepare_random_reddit_like_community_profile_image } from "../../../prepare/prepare_random_reddit_like_community_profile_image";

/**
 * Test that a member can view their own active profile and verify basic field population.
 *
 * Validates the complete profile lifecycle from member registration through profile initialization to profile retrieval. Confirms that all expected fields are properly populated with initialized values and that default state fields reflect expected initial values.
 *
 * Special attention is given to verifying that the display_name and bio text match their initialized values, the karma score starts at zero with no votes, the member summary contains valid identity information, the activeAvatar field is null when no image has been uploaded, activity arrays for posts and comments are empty for a new member, and the deleted_at field is null confirming active profile status.
 *
 * 1. Authenticate as a new member account.
 * 2. Initialize the member's profile with display name and bio text.
 * 3. Retrieve the profile using the profileId from the creation response.
 * 4. Validate all expected fields match the initialized values and default states.
 */
export async function test_api_profile_view_active_profile(
  connection: api.IConnection,
) {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IREdditLikeCommunityMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberBody });
  // 2. Profile initialization with display name and bio text
  const displayName = RandomGenerator.name();
  const bioText = RandomGenerator.paragraph({ sentences: 2 });
  const profileBody = {
    display_name: displayName,
    bio: bioText,
  } satisfies IREdditLikeCommunityProfile.ICreate;
  const createdProfile =
    await api.functional.redditLikeCommunity.member.profile.create(
      memberConnection,
      {
        body: profileBody,
      },
    );
  typia.assert(createdProfile);
  // 3. Retrieve the profile using profileId
  const profile =
    await api.functional.redditLikeCommunity.community_profiles.at(
      memberConnection,
      {
        profileId: createdProfile.id,
      },
    );
  typia.assert(profile);
  // 4. Validate all expected fields
  TestValidator.equals(
    "profile id matches created profile",
    profile.id,
    createdProfile.id,
  );
  TestValidator.equals(
    "display name matches initialized value",
    profile.display_name,
    displayName,
  );
  TestValidator.equals(
    "bio text matches initialized value",
    profile.bio,
    bioText,
  );
  TestValidator.equals("karma score is 0 with no votes", profile.karma, 0);
  TestValidator.predicate(
    "member summary has id",
    profile.member.id !== undefined,
  );
  TestValidator.predicate(
    "member summary has username",
    profile.member.username !== undefined,
  );
  TestValidator.predicate(
    "member summary has email",
    profile.member.email !== undefined,
  );
  TestValidator.predicate(
    "member summary has created_at",
    profile.member.created_at !== undefined,
  );
  TestValidator.equals(
    "active avatar is null with no image uploaded",
    profile.activeAvatar,
    null,
  );
  TestValidator.equals(
    "posts array is empty for new member",
    profile.posts.length,
    0,
  );
  TestValidator.equals(
    "comments array is empty for new member",
    profile.comments.length,
    0,
  );
  TestValidator.equals(
    "deleted_at is null for active profile",
    profile.deleted_at,
    null,
  );
}
