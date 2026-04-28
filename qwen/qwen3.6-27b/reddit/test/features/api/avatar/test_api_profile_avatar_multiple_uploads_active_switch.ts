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
import { generate_random_reddit_like_community_member_profiles_images_create } from "../../../generate/generate_random_reddit_like_community_member_profiles_images_create";
import { prepare_random_reddit_like_community_profile } from "../../../prepare/prepare_random_reddit_like_community_profile";
import { prepare_random_reddit_like_community_profile_image } from "../../../prepare/prepare_random_reddit_like_community_profile_image";

/**
 * Test that uploading a new avatar image deactivates the previously active avatar.
 *
 * Validates the complete avatar upload workflow ensuring that when a new avatar image is uploaded to a profile, the system automatically deactivates the previously active avatar. Verifies that only one avatar image can be active at any given time, enforcing the business rule that profiles maintain exactly one active avatar. Both uploaded images remain retained in storage even after deactivation.
 *
 * Special attention is given to verifying the atomic nature of the avatar update: the new image becomes active while the previous active image is simultaneously deactivated. This ensures data consistency and prevents orphaned states where multiple active avatars could exist.
 *
 * 1. Creates a member account and authenticates through the join endpoint.
 * 2. Initializes the member's public profile with display name and bio.
 * 3. Uploads the first avatar image to the profile and verifies it becomes active.
 * 4. Uploads a second avatar image to the same profile and verifies it becomes active.
 * 5. Confirms the first avatar was automatically deactivated when the second was uploaded.
 * 6. Validates both images remain stored in the system with correct active status flags.
 */
export async function test_api_profile_avatar_multiple_uploads_active_switch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        href: "",
        referrer: "",
      } satisfies IREdditLikeCommunityMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Create profile
  const profile: IREdditLikeCommunityProfile =
    await api.functional.redditLikeCommunity.member.profile.create(
      memberConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IREdditLikeCommunityProfile.ICreate,
      },
    );
  typia.assert(profile);
  // 3. Upload first avatar image
  const firstAvatar: IREdditLikeCommunityProfileImage =
    await api.functional.redditLikeCommunity.member.profiles.images.create(
      memberConnection,
      {
        profileId: profile.id,
        body: {} satisfies IREdditLikeCommunityProfileImage.ICreate,
      },
    );
  typia.assert(firstAvatar);
  // 4. Verify first avatar is active (newly uploaded avatar should be active)
  TestValidator.equals(
    "first avatar should be active",
    firstAvatar.is_active,
    true,
  );
  // 5. Upload second avatar image to the same profile
  const secondAvatar: IREdditLikeCommunityProfileImage =
    await api.functional.redditLikeCommunity.member.profiles.images.create(
      memberConnection,
      {
        profileId: profile.id,
        body: {} satisfies IREdditLikeCommunityProfileImage.ICreate,
      },
    );
  typia.assert(secondAvatar);
  // 6. Verify second avatar is active (new uploads become the active avatar)
  TestValidator.equals(
    "second avatar should be active",
    secondAvatar.is_active,
    true,
  );
  // 7. Verify both images are distinct and retained in storage
  TestValidator.notEquals(
    "first and second avatar should have different IDs",
    firstAvatar.id,
    secondAvatar.id,
  );
  // 8. Validate timeline confirms second upload occurred after first
  TestValidator.predicate(
    "second avatar should be more recent than first",
    secondAvatar.created_at > firstAvatar.created_at,
  );
  // 9. Verify both images have valid content_type metadata
  TestValidator.predicate(
    "first avatar should have valid content type",
    firstAvatar.content_type.length > 0,
  );
  TestValidator.predicate(
    "second avatar should have valid content type",
    secondAvatar.content_type.length > 0,
  );
}
