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
 * Test that retrieving a profile image with a mismatched profile ID returns 404 due to ownership validation.
 *
 * Validates the complete ownership mismatch scenario for profile image retrieval. Member A creates a profile and uploads an avatar image, then Member B creates a separate profile. When attempting to retrieve Member A's image using Member B's profile ID, the endpoint must return a 404 Not Found error.
 *
 * This test confirms that ownership verification correctly detects profile ID mismatches, preventing unauthorized access to images belonging to other profiles. Even though the endpoint is publicly accessible, ownership scoping remains enforced.
 *
 * 1. Member A registers and authenticates on the platform.
 * 2. Member A creates their public profile.
 * 3. Member A uploads an avatar image to their profile, obtaining an image ID.
 * 4. Member B registers and authenticates as a separate account.
 * 5. Member B creates their own public profile with a different profile ID.
 * 6. Attempt to retrieve Member A's image using Member B's profile ID, expecting 404.
 */
export async function test_api_profile_image_ownership_mismatch_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins platform
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    },
  });
  typia.assert(memberA);
  // 2. Member A creates their profile
  const profileA =
    await generate_random_reddit_like_community_member_profile_create(
      memberAConnection,
    );
  typia.assert(profileA);
  // 3. Member A uploads an avatar image to their profile
  const imageA =
    await generate_random_reddit_like_community_member_profiles_images_create(
      memberAConnection,
      {
        params: { profileId: profileA.id },
      },
    );
  typia.assert(imageA);
  // 4. Member B joins platform (separate account)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    },
  });
  typia.assert(memberB);
  // 5. Member B creates their own profile
  const profileB =
    await generate_random_reddit_like_community_member_profile_create(
      memberBConnection,
    );
  typia.assert(profileB);
  // 6. Attempt to retrieve Member A's image using Member B's profile ID — should return 404
  await TestValidator.httpError(
    "ownership mismatch returns 404",
    404,
    async () => {
      await api.functional.redditLikeCommunity.profiles.images.at(connection, {
        profileId: profileB.id,
        imageId: imageA.id,
      });
    },
  );
  // Verify the image's actual profile matches Member A's profile
  TestValidator.equals(
    "image belongs to correct profile",
    imageA.profile.id,
    profileA.id,
  );
}
