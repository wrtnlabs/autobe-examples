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
 * Test retrieving metadata for a profile avatar image deactivated by uploading a new avatar.
 *
 * Validates the complete avatar replacement workflow including member authentication, profile
 * creation, sequential avatar uploads, and metadata retrieval for deactivated images. Ensures
 * that when a new avatar is uploaded, the previous avatar's is_active flag is set to false
 * while maintaining all other metadata intact.
 *
 * The test verifies that the system correctly maintains historical avatar images even after
 * deactivation, with the is_active flag accurately reflecting the current status. Only one
 * active avatar exists per profile at any given time, and inactive images remain accessible
 * for metadata retrieval but are clearly marked as non-active.
 *
 * 1. Member authenticates and joins the platform.
 * 2. Member creates their public profile.
 * 3. Member uploads a first avatar image to the profile.
 * 4. Member uploads a second avatar image, deactivating the first one.
 * 5. Retrieve the first (now inactive) avatar's metadata using the public profile images endpoint.
 * 6. Validate that the first image's is_active flag is false and all other metadata is intact.
 */
export async function test_api_profile_image_inactive_metadata_after_replacement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create member profile
  const profile =
    await generate_random_reddit_like_community_member_profile_create(
      memberConnection,
    );
  typia.assert(profile);
  // 3. Upload first avatar image
  const firstImage =
    await generate_random_reddit_like_community_member_profiles_images_create(
      memberConnection,
      {
        params: {
          profileId: profile.id,
        },
      },
    );
  typia.assert(firstImage);
  // 4. Upload second avatar image (deactivates the first image)
  const secondImage =
    await generate_random_reddit_like_community_member_profiles_images_create(
      memberConnection,
      {
        params: {
          profileId: profile.id,
        },
      },
    );
  typia.assert(secondImage);
  // Verify second image is now the active one
  TestValidator.equals("second image is active", secondImage.is_active, true);
  // 5. Retrieve metadata for the first (now deactivated) image
  const inactiveImage =
    await api.functional.redditLikeCommunity.profiles.images.at(
      memberConnection,
      {
        profileId: profile.id,
        imageId: firstImage.id,
      },
    );
  typia.assert(inactiveImage);
  // 6. Validate the deactivated image metadata
  TestValidator.equals(
    "image id matches first image",
    inactiveImage.id,
    firstImage.id,
  );
  TestValidator.equals(
    "is_active is false for deactivated image",
    inactiveImage.is_active,
    false,
  );
  TestValidator.equals(
    "file_key is preserved",
    inactiveImage.file_key,
    firstImage.file_key,
  );
  TestValidator.equals(
    "content_type is preserved",
    inactiveImage.content_type,
    firstImage.content_type,
  );
  TestValidator.equals(
    "file_size is preserved",
    inactiveImage.file_size,
    firstImage.file_size,
  );
  TestValidator.equals(
    "width is preserved",
    inactiveImage.width,
    firstImage.width,
  );
  TestValidator.equals(
    "height is preserved",
    inactiveImage.height,
    firstImage.height,
  );
  TestValidator.equals(
    "profile id matches",
    inactiveImage.profile.id,
    profile.id,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    inactiveImage.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    inactiveImage.updated_at.length > 0,
  );
}
