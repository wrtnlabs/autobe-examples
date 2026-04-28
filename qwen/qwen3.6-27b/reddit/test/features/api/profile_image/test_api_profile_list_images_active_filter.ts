import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIREdditLikeCommunityProfileImage";
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
 * Test profile image filtering by active status with complete validation.
 *
 * Validates the complete workflow from member registration through profile initialization to active avatar image retrieval. Ensures the is_active boolean filter correctly restricts results to only the currently active profile avatar.
 *
 * Special attention is given to verifying pagination metadata correctness including current page number, total records matching actual data length, and total pages calculated as ceiling of records divided by limit. The ownership constraint ensures each returned image's profile reference matches the authenticated member's profile ID.
 *
 * 1. Authenticates as a new member account.
 * 2. Initializes the member's public profile with display name, bio, and an avatar image.
 * 3. Searches the profile's image history using the is_active=true filter to retrieve only active avatars.
 * 4. Verifies pagination metadata including current page, total records, total pages, and page limit.
 * 5. Verifies that all returned images have is_active set to true.
 * 6. Verifies each result contains complete image metadata (file_key, content_type, file_size, dimensions) and correct profile ownership.
 * 7. Verifies results are sorted by created_at in descending order.
 */
export async function test_api_profile_list_images_active_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Initialize profile with display name, bio, and an avatar image
  const profile =
    await generate_random_reddit_like_community_member_profile_create(
      memberConnection,
      {
        body: {
          avatar: {},
        },
      },
    );
  typia.assert(profile);
  // 3. Search profile images filtered by is_active=true
  const response =
    await api.functional.redditLikeCommunity.profiles.images.index(
      memberConnection,
      {
        profileId: profile.id,
        body: {
          is_active: true,
        },
      },
    );
  typia.assert(response);
  // 4. Verify pagination metadata
  TestValidator.predicate(
    "current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "total records matches data length",
    response.pagination.records === response.data.length,
  );
  TestValidator.predicate(
    "total pages calculation is correct",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 5. Verify all returned images have is_active=true
  TestValidator.predicate(
    "all results have is_active true",
    response.data.every((img) => img.is_active),
  );
  // 6. Verify each result contains complete image metadata and correct profile ownership
  for (const image of response.data) {
    typia.assert(image);
    TestValidator.equals(
      "profile ownership constraint",
      image.profile.id,
      profile.id,
    );
  }
  // 7. Verify results are sorted by created_at descending
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const createdAtA = new Date(response.data[i].created_at).getTime();
      const createdAtB = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `created_at descending at index ${i}`,
        createdAtA >= createdAtB,
      );
    }
  }
}
