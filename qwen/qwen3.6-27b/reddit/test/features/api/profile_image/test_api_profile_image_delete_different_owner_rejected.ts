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
 * Test that a member cannot delete another member's profile avatar image.
 *
 * Validates the authorization boundary enforcing owner-only deletion rights
 * for profile images. When a different member attempts to delete an image
 * that belongs to another member's profile, the server must reject the
 * request with a 403 Forbidden error.
 *
 * 1. First member registers and creates their profile with display name and bio.
 * 2. First member uploads an avatar image to their profile.
 * 3. Second member registers with separate authentication credentials.
 * 4. Second member attempts to delete the first member's avatar image.
 * 5. Server rejects the deletion attempt with 403 Forbidden error.
 */
export async function test_api_profile_image_delete_different_owner_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member joins and authenticates
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {},
  });
  // 2. First member creates their profile
  const profile =
    await generate_random_reddit_like_community_member_profile_create(
      member1Connection,
      {
        body: {
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(profile);
  // 3. First member uploads an avatar image
  const image =
    await generate_random_reddit_like_community_member_profiles_images_create(
      member1Connection,
      {
        params: { profileId: profile.id },
        body: {},
      },
    );
  typia.assert(image);
  // 4. Second member joins with separate authentication
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {},
  });
  // 5. Second member attempts to delete first member's avatar image - should fail with 403
  await TestValidator.error(
    "should reject deletion by different owner with HTTP error",
    async () => {
      await api.functional.redditLikeCommunity.member.profiles.images.erase(
        member2Connection,
        {
          profileId: profile.id,
          imageId: image.id,
        },
      );
    },
  );
}
