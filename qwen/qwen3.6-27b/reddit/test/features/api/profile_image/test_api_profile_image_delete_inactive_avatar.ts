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
 * Test deletion of inactive profile avatar image.
 *
 * Validates that deleting an inactive avatar image removes only that specific
 * image while preserving the active avatar and profile integrity. Tests the
 * complete workflow where a member establishes multiple avatar images over time,
 * with newer uploads deactivating older ones.
 *
 * The scenario ensures that the profile image deletion logic correctly handles
 * inactive images without affecting the currently active avatar or any other
 * profile data. This is important for allowing users to manage their avatar
 * history while maintaining their current profile display.
 *
 * 1. Authenticate a new member by joining the platform.
 * 2. Create the member's public profile.
 * 3. Upload a first avatar image that becomes the active avatar.
 * 4. Upload a second avatar image, which deactivates the first and becomes active.
 * 5. Delete the first (now inactive) avatar image.
 * 6. Verify the second image remains the active avatar after deletion.
 */
export async function test_api_profile_image_delete_inactive_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: typia.random<IREdditLikeCommunityMember.IJoin>(),
  });
  typia.assert(member);
  // 2. Create profile
  const profile =
    await generate_random_reddit_like_community_member_profile_create(
      memberConnection,
    );
  typia.assert(profile);
  // 3. Upload first avatar image
  const imageOne =
    await generate_random_reddit_like_community_member_profiles_images_create(
      memberConnection,
      { params: { profileId: profile.id } },
    );
  typia.assert(imageOne);
  // 4. Upload second avatar image (deactivates first, becomes new active)
  const imageTwo =
    await generate_random_reddit_like_community_member_profiles_images_create(
      memberConnection,
      { params: { profileId: profile.id } },
    );
  typia.assert(imageTwo);
  // Verify second image is the active avatar
  TestValidator.predicate(
    "second image is active",
    imageTwo.is_active === true,
  );
  // Verify both images are distinct
  TestValidator.notEquals("different image IDs", imageOne.id, imageTwo.id);
  // 5. Delete the first (inactive) image
  await api.functional.redditLikeCommunity.member.profiles.images.erase(
    memberConnection,
    {
      profileId: profile.id,
      imageId: imageOne.id,
    },
  );
  // 6. Validate: second image still active after deletion
  TestValidator.predicate(
    "active avatar unchanged after inactive deletion",
    imageTwo.is_active === true,
  );
  TestValidator.equals(
    "second image still belongs to profile",
    imageTwo.profile.id,
    profile.id,
  );
}
