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
 * Test deleting the currently active avatar image from a member's profile.
 *
 * Validates the complete workflow of member authentication, profile creation, avatar upload, and avatar deletion. Ensures that the active avatar image can be permanently removed from a user's profile using the DELETE endpoint with proper profileId and imageId path parameters.
 *
 * Special attention is given to verifying that the erase operation executes successfully when deleting the single active avatar, which should result in the profile having no displayed avatar afterward.
 *
 * 1. Member registers and authenticates to gain member-level platform access.
 * 2. Member creates their public profile with display name and bio.
 * 3. Member uploads an avatar image to the profile, which becomes the active avatar.
 * 4. Member deletes the uploaded active avatar image using the erase endpoint.
 */
export async function test_api_profile_image_delete_active_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, { body: {} });
  typia.assert(member);
  // 2. Create member profile
  const profile =
    await generate_random_reddit_like_community_member_profile_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(profile);
  // 3. Upload avatar image to the profile
  const image =
    await generate_random_reddit_like_community_member_profiles_images_create(
      memberConnection,
      {
        body: {},
        params: { profileId: profile.id },
      },
    );
  typia.assert(image);
  // 4. Delete the active avatar image
  await api.functional.redditLikeCommunity.member.profiles.images.erase(
    memberConnection,
    {
      profileId: profile.id,
      imageId: image.id,
    },
  );
}
