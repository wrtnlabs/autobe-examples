import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPost";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Post search endpoint filtering by post type and community.
 *
 * Validates the post search endpoint's filtering capabilities by testing queries that narrow results by content type and community boundary. Ensures that filtering by post_type returns only text, link, or image posts matching the criteria, and that filtering by community_id restricts results to posts published within that specific community. Combined filters are also tested to confirm both conditions apply simultaneously.
 *
 * Pagination metadata is verified to ensure the response includes current page, total records, total pages, and limit. Each returned post summary is checked for the presence of essential fields including author attribution and community context.
 *
 * 1. Authenticate as a member.
 * 2. Create two communities and subscribe to both.
 * 3. Create multiple posts of different types across both communities.
 * 4. Search posts filtering by post_type only.
 * 5. Search posts filtering by community_id only.
 * 6. Search posts filtering by both post_type and community_id.
 * 7. Validate pagination and post summary structure in each result.
 */
export async function test_api_post_search_filter_by_type_and_community(
  connection: api.IConnection,
): Promise<void> {
  /* --- Setup: Authenticate member --- */
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
    },
  });
  /* --- Setup: Create two communities --- */
  const communityA =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(communityA);
  const communityB =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(communityB);
  /* --- Setup: Subscribe to both communities --- */
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    {
      body: { community_id: communityA.id },
    },
  );
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    {
      body: { community_id: communityB.id },
    },
  );
  /* --- Setup: Create text post in community A --- */
  const textPostA =
    await generate_random_reddit_like_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          post_type: "text",
          community_id: communityA.id,
          body: RandomGenerator.paragraph({ sentences: 10 }),
        },
      },
    );
  typia.assert(textPostA);
  /* --- Setup: Create another text post in community A --- */
  const textPostA2 =
    await generate_random_reddit_like_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          post_type: "text",
          community_id: communityA.id,
          body: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(textPostA2);
  /* --- Setup: Create link post in community A --- */
  const linkPostA =
    await generate_random_reddit_like_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          post_type: "link",
          community_id: communityA.id,
          url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(linkPostA);
  /* --- Setup: Create text post in community B --- */
  const textPostB =
    await generate_random_reddit_like_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          post_type: "text",
          community_id: communityB.id,
          body: RandomGenerator.paragraph({ sentences: 8 }),
        },
      },
    );
  typia.assert(textPostB);
  /* --- Test 1: Filter by post_type='text' --- */
  const searchByTextRequest: IREdditLikeCommunityPost.IRequest = {
    post_type: "text",
  };
  const textResults = await api.functional.redditLikeCommunity.posts.index(
    memberConnection,
    { body: searchByTextRequest },
  );
  typia.assert(textResults);
  TestValidator.predicate(
    "text filter returns posts with post_type text",
    textResults.data.every((post) => post.post_type === "text"),
  );
  TestValidator.predicate(
    "text filter returns non-empty results",
    textResults.data.length >= 1,
  );
  TestValidator.equals(
    "text filter pagination records matches data length",
    textResults.pagination.records,
    textResults.data.length,
  );
  /* --- Test 2: Filter by community_id=communityA.id --- */
  const searchByCommunityRequest: IREdditLikeCommunityPost.IRequest = {
    community_id: communityA.id,
  };
  const communityResults = await api.functional.redditLikeCommunity.posts.index(
    memberConnection,
    {
      body: searchByCommunityRequest,
    },
  );
  typia.assert(communityResults);
  TestValidator.predicate(
    "community filter returns only posts from community A",
    communityResults.data.every((post) => post.community.id === communityA.id),
  );
  TestValidator.predicate(
    "community filter returns non-empty results",
    communityResults.data.length >= 1,
  );
  TestValidator.equals(
    "community filter pagination records matches data length",
    communityResults.pagination.records,
    communityResults.data.length,
  );
  /* --- Test 3: Filter by both post_type='link' and community_id=communityA.id --- */
  const combinedFilterRequest: IREdditLikeCommunityPost.IRequest = {
    post_type: "link",
    community_id: communityA.id,
  };
  const combinedResults = await api.functional.redditLikeCommunity.posts.index(
    memberConnection,
    {
      body: combinedFilterRequest,
    },
  );
  typia.assert(combinedResults);
  TestValidator.predicate(
    "combined filter returns only link posts from community A",
    combinedResults.data.every(
      (post) =>
        post.post_type === "link" && post.community.id === communityA.id,
    ),
  );
  TestValidator.predicate(
    "combined filter returns at least the link post",
    combinedResults.data.length >= 1,
  );
  /* --- Test 4: Validate post summary structure --- */
  if (textResults.data.length > 0) {
    const samplePost = textResults.data[0];
    typia.assert(samplePost);
    TestValidator.predicate(
      "post summary has valid id",
      samplePost.id !== undefined && samplePost.id.length > 0,
    );
    TestValidator.predicate(
      "post summary has title",
      samplePost.title !== undefined && samplePost.title.length > 0,
    );
    TestValidator.predicate(
      "post summary has post_type",
      samplePost.post_type !== undefined,
    );
    TestValidator.predicate(
      "post summary has author with id",
      samplePost.author.id !== undefined,
    );
    TestValidator.predicate(
      "post summary has community with id",
      samplePost.community.id !== undefined,
    );
    TestValidator.predicate(
      "post summary has vote_score",
      typeof samplePost.vote_score === "number",
    );
    TestValidator.predicate(
      "post summary has comment_count",
      typeof samplePost.comment_count === "number",
    );
    TestValidator.predicate(
      "post summary has created_at",
      samplePost.created_at !== undefined && samplePost.created_at.length > 0,
    );
  }
  /* --- Test 5: Validate pagination metadata --- */
  TestValidator.predicate(
    "pagination has current page",
    typeof textResults.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof textResults.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records count",
    typeof textResults.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages count",
    typeof textResults.pagination.pages === "number",
  );
}
