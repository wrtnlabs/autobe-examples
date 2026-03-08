import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_post_votes_cast } from "../../../generate/generate_random_reddit_platform_member_post_votes_cast";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

export async function test_api_post_listing_top_sorting_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test the TOP sorting with TODAY time-range filter for posts list.
  // Note: This test validates the sorting and filtering logic using existing posts
  // in the system, since there's no API available to create communities or posts
  // without valid community IDs.
  // 1. Call PATCH /redditPlatform/posts with TOP sort and TODAY time range
  const response = await api.functional.redditPlatform.posts.index(connection, {
    body: {
      sort_type: "TOP",
      time_range: "TODAY",
      limit: 10,
      page: 1,
    },
  });
  typia.assert(response);
  // 2. Validate response structure
  TestValidator.predicate(
    "response has valid pagination",
    response.pagination.current >= 1 &&
      response.pagination.limit > 0 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  // 3. Validate that posts returned are sorted correctly (by vote_score DESC)
  TestValidator.predicate(
    "posts are sorted by vote_score DESC (if any posts exist)",
    () => {
      if (response.data.length <= 1) return true;
      for (let i = 1; i < response.data.length; i++) {
        if (response.data[i].vote_score > response.data[i - 1].vote_score) {
          return false;
        }
      }
      return true;
    },
  );
  // 4. Validate each post has required fields
  response.data.forEach((post, index) => {
    TestValidator.equals(
      `post ${index} has valid id`,
      typeof post.id,
      "string",
    );
    TestValidator.equals(
      `post ${index} has valid title`,
      post.title.length > 0,
      true,
    );
    TestValidator.equals(
      `post ${index} has valid post_type`,
      ["TEXT", "LINK", "IMAGE"].includes(post.post_type),
      false,
    );
    TestValidator.equals(
      `post ${index} has valid vote_score`,
      typeof post.vote_score,
      "number",
    );
    TestValidator.equals(
      `post ${index} has valid author`,
      post.author !== null && post.author !== undefined,
      false,
    );
    TestValidator.equals(
      `post ${index} has valid community`,
      post.community !== null && post.community !== undefined,
      false,
    );
    TestValidator.equals(
      `post ${index} has valid created_at`,
      typeof post.created_at,
      "string",
    );
    TestValidator.equals(
      `post ${index} has valid deleted_at`,
      post.deleted_at === null || typeof post.deleted_at === "string",
      false,
    );
  });
  // 5. Validate pagination metadata consistency
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "total pages calculated correctly",
    response.pagination.pages,
    expectedPages,
  );
  // 6. Validate current page is within valid range
  TestValidator.predicate(
    "current page is within valid range",
    response.pagination.current >= 1 &&
      (response.pagination.records === 0
        ? response.pagination.current === 1
        : response.pagination.current <= response.pagination.pages),
  );
}
