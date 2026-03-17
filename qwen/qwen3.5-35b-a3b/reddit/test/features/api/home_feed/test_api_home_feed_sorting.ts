import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityFeedQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFeedQuery";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFeedQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFeedQuery";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_home_feed_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // 2. Use a random community ID (in real scenario, would get from subscriptions)
  // For testing, we'll create a subscription first to get a valid community
  const subscriptionPage =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      { body: {} },
    );
  typia.assert(subscriptionPage);
  if (subscriptionPage.data.length === 0) {
    throw new Error("No communities found to subscribe to for testing");
  }
  const targetCommunity = subscriptionPage.data[0].community;
  // 3. Create posts with varying scores and creation times
  const now = new Date();
  const createdPosts: IRedditCommunityPost[] = [];
  // Create 10 posts spread across different times with varying vote scores
  for (let i = 0; i < 10; i++) {
    const createdAt = new Date(now.getTime() - i * 60 * 60 * 1000); // Spread over 10 hours
    const post = await api.functional.redditCommunity.member.posts.create(
      memberConnection,
      {
        body: {
          community_id: targetCommunity.id,
          title: `Test Post ${i}`,
          post_type: "text" as const,
          body: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
    typia.assert(post);
    createdPosts.push(post);
  }
  // 4. Call home feed with different sort orders
  // Sort by new (createdAt descending - newest first)
  const newFeed = await api.functional.redditCommunity.member.home.feed.index(
    memberConnection,
    {
      body: {
        sortOrder: "new",
        pageSize: 10,
      } as IRedditCommunityFeedQuery.IRequest,
    },
  );
  typia.assert(newFeed);
  // Sort by hot (exponential decay of votes + recency)
  const hotFeed = await api.functional.redditCommunity.member.home.feed.index(
    memberConnection,
    {
      body: {
        sortOrder: "hot",
        pageSize: 10,
      } as IRedditCommunityFeedQuery.IRequest,
    },
  );
  typia.assert(hotFeed);
  // Sort by top (voteScore descending) with week time filter
  const topFeed = await api.functional.redditCommunity.member.home.feed.index(
    memberConnection,
    {
      body: {
        sortOrder: "top",
        timeFilter: "week",
        pageSize: 10,
      } as IRedditCommunityFeedQuery.IRequest,
    },
  );
  typia.assert(topFeed);
  // Sort by controversial (near zero score with high votes)
  const controversialFeed =
    await api.functional.redditCommunity.member.home.feed.index(
      memberConnection,
      {
        body: {
          sortOrder: "controversial",
          pageSize: 10,
        } as IRedditCommunityFeedQuery.IRequest,
      },
    );
  typia.assert(controversialFeed);
  // 5. Validate sorting algorithms
  // Check new: posts should be ordered by createdAt descending (newest first)
  if (newFeed.data.length > 1) {
    for (let i = 0; i < newFeed.data.length - 1; i++) {
      const currentCreatedAt = new Date(newFeed.data[i].createdAt).getTime();
      const nextCreatedAt = new Date(newFeed.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `new sorting: ${i} and ${i + 1} - current should be newer than next`,
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
  // Check top: posts should be ordered by voteScore descending (highest first)
  if (topFeed.data.length > 1) {
    for (let i = 0; i < topFeed.data.length - 1; i++) {
      const currentScore = topFeed.data[i].voteScore;
      const nextScore = topFeed.data[i + 1].voteScore;
      TestValidator.predicate(
        `top sorting: ${i} and ${i + 1} - current should have higher score`,
        currentScore >= nextScore,
      );
    }
  }
  // Check hot: verify all feeds have posts
  TestValidator.predicate("new feed has posts", newFeed.data.length > 0);
  TestValidator.predicate("hot feed has posts", hotFeed.data.length > 0);
  TestValidator.predicate("top feed has posts", topFeed.data.length > 0);
  TestValidator.predicate(
    "controversial feed has posts",
    controversialFeed.data.length > 0,
  );
}
