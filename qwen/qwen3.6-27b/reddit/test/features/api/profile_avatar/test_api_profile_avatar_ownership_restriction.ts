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
 * Test profile avatar ownership restriction that only the profile owner can upload avatar images.
 *
 * Validates the ownership verification mechanism that prevents unauthorized members from uploading
 * avatar images to profiles they do not own. The ownership check ensures that the authenticated
 * member (user_id) must match the profile owner.
 *
 * 1. Member A joins and creates their profile.
 * 2. Member B joins as a separate authenticated user.
 * 3. Member B attempts to upload an avatar image to Member A's profile.
 * 4. Verify the request is rejected due to ownership violation.
 */
export async function test_api_profile_avatar_ownership_restriction(
  connection: api.IConnection,
) {
  // 1. Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {},
  });
  // 2. Member A creates profile
  const profile =
    await api.functional.redditLikeCommunity.member.profile.create(
      memberAConnection,
      {
        body: {} satisfies IREdditLikeCommunityProfile.ICreate,
      },
    );
  typia.assert(profile);
  // 3. Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {},
  });
  // 4. Member B attempts to upload avatar image to Member A's profile (should fail)
  await TestValidator.error(
    "Member B cannot upload avatar image to Member A's profile due to ownership violation",
    async () => {
      await api.functional.redditLikeCommunity.member.profiles.images.create(
        memberBConnection,
        {
          profileId: profile.id,
          body: {} satisfies IREdditLikeCommunityProfileImage.ICreate,
        },
      );
    },
  );
}
