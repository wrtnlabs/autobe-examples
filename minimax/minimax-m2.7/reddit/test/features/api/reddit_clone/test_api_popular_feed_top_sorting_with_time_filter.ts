import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
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
import { generate_random_reddit_clone_member_reddit_clone_posts_votes_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_votes_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_popular_feed_top_sorting_with_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.alphabets(8),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create multiple posts
  const posts: IRedditClonePost[] = [];
  const postCount = 5;
  for (let i = 0; i < postCount; i++) {
    const post = await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          title: `Test Post ${i + 1}`,
          type: "text",
          body: `This is test content for post ${i + 1}`,
        },
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 5. Cast votes to establish varying vote scores
  // Upvote each post with increasing number of votes
  for (let i = 0; i < posts.length; i++) {
    const voteCount = i + 1; // First post gets 1 vote, second gets 2, etc.
    for (let v = 0; v < voteCount; v++) {
      await generate_random_reddit_clone_member_reddit_clone_posts_votes_create(
        memberConnection,
        {
          body: {
            direction: "upvote",
          },
          params: {
            postId: posts[i].id,
          },
        },
      );
    }
  }
  // 6. Request popular feed with sort='top' and timeRange='week'
  const weekFeed = await api.functional.redditClone.member.feed.popular.index(
    memberConnection,
    {
      body: {
        sort: "top",
        timeRange: "week",
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(weekFeed);
  // Validate all posts are within the last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  for (const post of weekFeed.data) {
    const postDate = new Date(post.createdAt);
    TestValidator.predicate(
      "post within last week",
      postDate.getTime() >= oneWeekAgo.getTime(),
    );
  }
  // Validate posts are ordered by vote score descending
  for (let i = 1; i < weekFeed.data.length; i++) {
    TestValidator.predicate(
      "posts ordered by vote score descending",
      weekFeed.data[i - 1].voteScore >= weekFeed.data[i].voteScore,
    );
  }
  // 7. Test timeRange='month' filter
  const monthFeed = await api.functional.redditClone.member.feed.popular.index(
    memberConnection,
    {
      body: {
        sort: "top",
        timeRange: "month",
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(monthFeed);
  // Validate all posts are within the last 30 days
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  for (const post of monthFeed.data) {
    const postDate = new Date(post.createdAt);
    TestValidator.predicate(
      "post within last month",
      postDate.getTime() >= oneMonthAgo.getTime(),
    );
  }
  // 8. Validate time filter is ignored when sort='hot'
  const hotFeed = await api.functional.redditClone.member.feed.popular.index(
    memberConnection,
    {
      body: {
        sort: "hot",
        timeRange: "week", // timeRange should be ignored for 'hot' sort
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(hotFeed);
  // 9. Validate time filter is ignored when sort='new'
  const newFeed = await api.functional.redditClone.member.feed.popular.index(
    memberConnection,
    {
      body: {
        sort: "new",
        timeRange: "week", // timeRange should be ignored for 'new' sort
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(newFeed);
  // Validate 'new' sort returns posts in reverse chronological order
  for (let i = 1; i < newFeed.data.length; i++) {
    const prevDate = new Date(newFeed.data[i - 1].createdAt);
    const currDate = new Date(newFeed.data[i].createdAt);
    TestValidator.predicate(
      "posts ordered by created_at descending",
      prevDate.getTime() >= currDate.getTime(),
    );
  }
  // 10. Test 'all' time range (no filter)
  const allTimeFeed =
    await api.functional.redditClone.member.feed.popular.index(
      memberConnection,
      {
        body: {
          sort: "top",
          timeRange: "all",
          limit: 10,
        } satisfies IRedditClonePost.IRequest,
      },
    );
  typia.assert(allTimeFeed);
  // Validate posts are still ordered by vote score descending for 'all'
  for (let i = 1; i < allTimeFeed.data.length; i++) {
    TestValidator.predicate(
      "all time posts ordered by vote score descending",
      allTimeFeed.data[i - 1].voteScore >= allTimeFeed.data[i].voteScore,
    );
  }
}
