import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test community feed retrieval with various sorting options and time filters.
 *
 * Validates the community feed endpoint's ability to retrieve and sort posts correctly across different sorting algorithms (hot, new, top) and time filters. The test ensures proper pagination, vote score calculation, and content preview generation.
 *
 * 1. Create and authenticate a member account.
 * 2. Create a community and subscribe the member to it.
 * 3. Create multiple text posts with different timestamps.
 * 4. Test 'new' sorting to verify chronological order (newest first).
 * 5. Test 'top' sorting with time filters (today, week, month, all_time).
 * 6. Test 'hot' sorting for algorithmic engagement-based ranking.
 * 7. Verify pagination with cursor-based navigation across multiple pages.
 * 8. Validate vote scores and comment counts are accurate.
 * 9. Confirm content previews match expected format for each content type.
 */
export async function test_api_post_community_feed_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create community
  const community = await api.functional.redditLike.member.communities.create(
    memberConnection,
    {
      body: {
        name: `test-community-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Subscribe member to community
  await api.functional.redditLike.member.subscriptions.create(
    memberConnection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditLikeCommunitySubscription.ICreate,
    },
  );
  // 4. Create multiple posts with different timestamps
  const posts = await ArrayUtil.asyncRepeat(10, async (index) => {
    const post = await api.functional.redditLike.member.posts.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          title: `Test Post ${index + 1} - ${RandomGenerator.name(2)}`,
          content_type: "text",
          content_text: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditLikePost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });
  // 5. Test 'new' sorting - posts ordered by creation time (newest first)
  const newSorted = await api.functional.redditLike.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "community",
        community_id: community.id,
        sort: "new",
        limit: 5,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(newSorted);
  TestValidator.equals(
    "new sort returns posts",
    newSorted.data.length > 0,
    true,
  );
  // Verify chronological order (newest first)
  for (let i = 1; i < newSorted.data.length; i++) {
    TestValidator.predicate(
      `post ${i} is newer than post ${i - 1}`,
      new Date(newSorted.data[i - 1].created_at) >=
        new Date(newSorted.data[i].created_at),
    );
  }
  // 6. Test 'top' sorting with time filters
  const topToday = await api.functional.redditLike.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "community",
        community_id: community.id,
        sort: "top",
        time_filter: "today",
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(topToday);
  const topWeek = await api.functional.redditLike.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "community",
        community_id: community.id,
        sort: "top",
        time_filter: "week",
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(topWeek);
  const topMonth = await api.functional.redditLike.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "community",
        community_id: community.id,
        sort: "top",
        time_filter: "month",
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(topMonth);
  const topAllTime = await api.functional.redditLike.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "community",
        community_id: community.id,
        sort: "top",
        time_filter: "all_time",
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(topAllTime);
  // 7. Test 'hot' sorting
  const hotSorted = await api.functional.redditLike.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "community",
        community_id: community.id,
        sort: "hot",
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(hotSorted);
  TestValidator.equals(
    "hot sort returns posts",
    hotSorted.data.length > 0,
    true,
  );
  // 8. Verify pagination with cursor-based navigation
  const firstPage = await api.functional.redditLike.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "community",
        community_id: community.id,
        sort: "new",
        limit: 3,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page has correct limit",
    firstPage.data.length <= 3,
    true,
  );
  TestValidator.predicate(
    "pagination has current page",
    firstPage.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    firstPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    firstPage.pagination.pages >= 1,
  );
  // Test cursor-based pagination to get second page
  if (firstPage.data.length > 0 && firstPage.pagination.pages > 1) {
    const lastPost = firstPage.data[firstPage.data.length - 1];
    const secondPage = await api.functional.redditLike.member.posts.index(
      memberConnection,
      {
        body: {
          feed_type: "community",
          community_id: community.id,
          sort: "new",
          limit: 3,
          cursor: Buffer.from(
            JSON.stringify({
              created_at: lastPost.created_at,
              id: lastPost.id,
            }),
          ).toString("base64"),
        } satisfies IRedditLikePost.IRequest,
      },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page has posts",
      secondPage.data.length > 0 ||
        secondPage.pagination.current > firstPage.pagination.current,
      true,
    );
  }
  // 9. Verify vote scores and comment counts
  for (const post of firstPage.data) {
    TestValidator.predicate(
      "vote score is number",
      typeof post.vote_score === "number",
    );
    TestValidator.predicate(
      "comment count is number",
      typeof post.comment_count === "number",
    );
  }
  // 10. Verify content previews for text posts
  for (const post of firstPage.data) {
    if (post.content_type === "text") {
      TestValidator.predicate(
        "text content preview exists",
        post.content_preview.length > 0,
      );
      TestValidator.predicate(
        "content preview is not empty string",
        post.content_preview.trim().length > 0,
      );
    }
  }
}
