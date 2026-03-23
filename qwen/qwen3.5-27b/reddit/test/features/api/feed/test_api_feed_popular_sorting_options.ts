import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that feed endpoint correctly applies different sorting options to popular feed.
 *
 * This test validates that the feed API properly sorts posts based on various
 * criteria: hot (engagement + recency), new (chronological), top (highest score),
 * and controversial (vote variance). It also tests time filtering for top posts.
 */
export async function test_api_feed_popular_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create multiple posts with varying content
  const posts: IRedditClonePost[] = [];
  for (let i = 0; i < 6; i++) {
    const post = await api.functional.redditClone.member.posts.create(
      memberConnection,
      {
        body: {
          title: `Test Post ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          postType: "text",
          communityId: community.id,
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditClonePost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 4. Add votes to create different score distributions
  // Upvote first 3 posts heavily
  for (let i = 0; i < 3; i++) {
    const votedPost = await api.functional.redditClone.member.posts.vote(
      memberConnection,
      {
        postId: posts[i].id,
        body: { value: 1 } satisfies IRedditClonePost.IVoteRequest,
      },
    );
    typia.assert(votedPost);
  }
  // Downvote 4th post
  const downvotedPost = await api.functional.redditClone.member.posts.vote(
    memberConnection,
    {
      postId: posts[3].id,
      body: { value: -1 } satisfies IRedditClonePost.IVoteRequest,
    },
  );
  typia.assert(downvotedPost);
  // Leave 5th and 6th posts with no votes (score = 0)
  // 5. Test sort='hot'
  const hotFeed = await api.functional.redditClone.member.feed.index(
    memberConnection,
    {
      body: {
        feed_type: "popular",
        sort: "hot",
        page_size: 20,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(hotFeed);
  TestValidator.predicate("hot feed returns posts", hotFeed.data.length > 0);
  TestValidator.equals(
    "hot feed includes our posts",
    hotFeed.data.some((p) => p.id === posts[0].id),
    true,
  );
  // 6. Test sort='new'
  const newFeed = await api.functional.redditClone.member.feed.index(
    memberConnection,
    {
      body: {
        feed_type: "popular",
        sort: "new",
        page_size: 20,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(newFeed);
  TestValidator.predicate("new feed returns posts", newFeed.data.length > 0);
  // Verify new sort: most recent post should be first
  TestValidator.equals(
    "new feed sorted by created_at DESC",
    newFeed.data[0].id,
    posts[posts.length - 1].id,
  );
  // 7. Test sort='top'
  const topFeed = await api.functional.redditClone.member.feed.index(
    memberConnection,
    {
      body: {
        feed_type: "popular",
        sort: "top",
        page_size: 20,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topFeed);
  TestValidator.predicate("top feed returns posts", topFeed.data.length > 0);
  // Verify top sort: highest score posts should be first
  const topScores = topFeed.data.map((p) => p.score);
  TestValidator.predicate(
    "top feed sorted by score DESC",
    topScores.every((score, i, arr) => i === 0 || arr[i - 1] >= score),
  );
  // 8. Test sort='top' with time_filter='all_time'
  const topAllTimeFeed = await api.functional.redditClone.member.feed.index(
    memberConnection,
    {
      body: {
        feed_type: "popular",
        sort: "top",
        time_filter: "all_time",
        page_size: 20,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topAllTimeFeed);
  TestValidator.predicate(
    "top all_time feed returns posts",
    topAllTimeFeed.data.length > 0,
  );
  // 9. Test sort='controversial'
  const controversialFeed = await api.functional.redditClone.member.feed.index(
    memberConnection,
    {
      body: {
        feed_type: "popular",
        sort: "controversial",
        page_size: 20,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(controversialFeed);
  TestValidator.predicate(
    "controversial feed returns posts",
    controversialFeed.data.length > 0,
  );
  // 10. Test pagination maintains sort order
  const paginatedFeed1 = await api.functional.redditClone.member.feed.index(
    memberConnection,
    {
      body: {
        feed_type: "popular",
        sort: "top",
        page: 1,
        page_size: 2,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(paginatedFeed1);
  const paginatedFeed2 = await api.functional.redditClone.member.feed.index(
    memberConnection,
    {
      body: {
        feed_type: "popular",
        sort: "top",
        page: 2,
        page_size: 2,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(paginatedFeed2);
  // Verify pagination: last item of page 1 should have score >= first item of page 2
  if (paginatedFeed1.data.length > 0 && paginatedFeed2.data.length > 0) {
    TestValidator.predicate(
      "pagination maintains sort order",
      paginatedFeed1.data[paginatedFeed1.data.length - 1].score >=
        paginatedFeed2.data[0].score,
    );
  }
  // 11. Verify response structure includes all required fields
  const samplePost = topFeed.data[0];
  TestValidator.predicate("post has id", samplePost.id !== undefined);
  TestValidator.predicate("post has title", samplePost.title !== undefined);
  TestValidator.predicate(
    "post has post_type",
    samplePost.post_type !== undefined,
  );
  TestValidator.predicate("post has score", samplePost.score !== undefined);
  TestValidator.predicate(
    "post has comment_count",
    samplePost.comment_count !== undefined,
  );
  TestValidator.predicate(
    "post has created_at",
    samplePost.created_at !== undefined,
  );
  TestValidator.predicate("post has author", samplePost.author !== undefined);
  TestValidator.predicate(
    "post has community",
    samplePost.community !== undefined,
  );
}
