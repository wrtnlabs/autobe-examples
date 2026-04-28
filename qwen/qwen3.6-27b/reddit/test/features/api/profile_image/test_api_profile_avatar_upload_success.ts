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

export async function test_api_profile_avatar_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authenticates via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await api.functional.redditLikeCommunity.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IREdditLikeCommunityMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // 2. Member creates their profile
  const profile =
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
  // 3. Member uploads a valid image file to their profile
  const image =
    await api.functional.redditLikeCommunity.member.profiles.images.create(
      memberConnection,
      {
        profileId: profile.id,
        body: {} satisfies IREdditLikeCommunityProfileImage.ICreate,
      },
    );
  typia.assert(image);
  // 4. Verify response contains all required fields and business logic
  TestValidator.equals(
    "content_type is image/png",
    image.content_type,
    "image/png",
  );
  TestValidator.predicate("file_size is positive", image.file_size > 0);
  TestValidator.predicate("width is positive", image.width > 0);
  TestValidator.predicate("height is positive", image.height > 0);
  TestValidator.equals("is_active is true", image.is_active, true);
  TestValidator.equals("profile id matches", image.profile.id, profile.id);
}
