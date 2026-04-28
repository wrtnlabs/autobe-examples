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
 * Test member profile update with avatar URL referencing an uploaded image.
 *
 * Validates the complete workflow of updating a profile's avatar by first registering a member, initializing their profile, uploading a profile image, and then updating the profile to reference that image as the active avatar. Ensures that setting avatar_url to an existing file_key correctly activates that image and that the returned profile contains the updated activeAvatar with matching file metadata.
 *
 * 1. Member registers and authenticates via join endpoint.
 * 2. Member initializes their public profile with optional display name and bio.
 * 3. Member uploads a profile image attached to their profile.
 * 4. Member updates their profile with avatar_url set to the uploaded image's file_key.
 * 5. Validates the returned profile's activeAvatar references the correct image and is marked as active.
 */
export async function test_api_profile_update_with_avatar_url(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(memberAuthorized);
  const memberId = memberAuthorized.id;
  // 2. Initialize member's profile
  const profile =
    await generate_random_reddit_like_community_member_profile_create(
      memberConnection,
      {},
    );
  typia.assert(profile);
  const profileId = profile.id;
  // 3. Upload a profile image to the profile
  const uploadedImage =
    await generate_random_reddit_like_community_member_profiles_images_create(
      memberConnection,
      {
        params: { profileId },
        body: {},
      },
    );
  typia.assert(uploadedImage);
  const avatarFileKey = uploadedImage.file_key;
  // 4. Update profile with avatar_url referencing the uploaded image's file_key
  const body = {
    avatar_url: avatarFileKey,
  } satisfies IREdditLikeCommunityProfile.IUpdate;
  const updatedProfile =
    await api.functional.redditLikeCommunity.members.profiles.update(
      memberConnection,
      {
        memberId,
        body,
      },
    );
  typia.assert(updatedProfile);
  // 5. Validate that activeAvatar was updated correctly
  const activeAvatar = updatedProfile.activeAvatar;
  TestValidator.predicate("activeAvatar exists", activeAvatar !== null);
  const safeAvatar = typia.assert(activeAvatar!);
  TestValidator.equals(
    "activeAvatar file_key matches uploaded image",
    safeAvatar.file_key,
    avatarFileKey,
  );
  TestValidator.predicate(
    "activeAvatar is marked as active",
    safeAvatar.is_active,
  );
  TestValidator.equals(
    "activeAvatar belongs to same profile",
    safeAvatar.profile.id,
    profileId,
  );
}
