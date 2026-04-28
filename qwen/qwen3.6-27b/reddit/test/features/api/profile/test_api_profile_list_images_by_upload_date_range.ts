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
 * Tests profile image upload history search with date range filtering.
 *
 * Validates the complete profile image search workflow including member registration, profile creation, and image history retrieval with date range filters. Ensures that images are correctly filtered by created_at_from and created_at_to parameters, pagination metadata is accurate, and results are sorted by creation date in descending order.
 *
 * Special attention is given to verifying that images outside the specified date range are excluded, empty results are handled gracefully with zero-record pagination, and all image metadata fields are present in the response.
 *
 * 1. Register a new member account and authenticate.
 * 2. Create the member's profile with display name and bio.
 * 3. Search profile images using created_at_from and created_at_to date range filters.
 * 4. Verify response pagination metadata includes current page, limit, and total records.
 * 5. Verify all returned images fall within the specified date range.
 * 6. Verify results are sorted by created_at descending.
 * 7. Verify each image summary contains complete metadata fields.
 * 8. Verify future date range returns empty data array with zero pagination records.
 */
export async function test_api_profile_list_images_by_upload_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create member profile
  const profile =
    await api.functional.redditLikeCommunity.member.profile.create(
      memberConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(profile);
  // 3. Search profile images with recent date range filters
  const now = new Date();
  const createdAtFrom = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAtTo = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const response =
    await api.functional.redditLikeCommunity.profiles.images.index(
      memberConnection,
      {
        profileId: profile.id,
        body: {
          created_at_from: createdAtFrom,
          created_at_to: createdAtTo,
          page: 1,
          limit: 20,
        } satisfies IREdditLikeCommunityProfileImage.IRequest,
      },
    );
  typia.assert(response);
  // 4. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Verify all images fall within the date range
  for (const image of response.data) {
    const imageTime = new Date(image.created_at).getTime();
    const fromTime = new Date(createdAtFrom).getTime();
    const toTime = new Date(createdAtTo).getTime();
    TestValidator.predicate(
      `image ${image.id} created_at is within range [${createdAtFrom}, ${createdAtTo}]`,
      imageTime >= fromTime && imageTime <= toTime,
    );
  }
  // 6. Verify results are sorted by created_at descending
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentTime = new Date(response.data[i].created_at).getTime();
      const nextTime = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `image ${i} created_at >= image ${i + 1} created_at`,
        currentTime >= nextTime,
      );
    }
  }
  // 7. Verify each image has complete metadata
  for (const image of response.data) {
    TestValidator.predicate(
      "image belongs to correct profile",
      image.profile.id === profile.id,
    );
    TestValidator.predicate("image has valid file_size", image.file_size > 0);
    TestValidator.predicate("image has valid width", image.width > 0);
    TestValidator.predicate("image has valid height", image.height > 0);
  }
  // 8. Verify empty result with future date range
  const futureFrom = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureTo = new Date(
    now.getTime() + 400 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyResponse =
    await api.functional.redditLikeCommunity.profiles.images.index(
      memberConnection,
      {
        profileId: profile.id,
        body: {
          created_at_from: futureFrom,
          created_at_to: futureTo,
          page: 1,
          limit: 20,
        } satisfies IREdditLikeCommunityProfileImage.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty result set has zero records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result set data array is empty",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty result set pagination current is 1",
    emptyResponse.pagination.current,
    1,
  );
}
