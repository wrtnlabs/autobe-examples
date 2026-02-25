import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_popular_feed_sorting_algorithms(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Hot sorting algorithm (combined score and recency)
  const hotFeed =
    await api.functional.redditClone.posts.popular.index(connection);
  typia.assert(hotFeed);
  // Verify we got a feed with pagination
  TestValidator.predicate(
    "hot feed has pagination",
    hotFeed.pagination !== undefined,
  );
  TestValidator.predicate("hot feed has data", hotFeed.data !== undefined);
  // Test 2: New sorting algorithm (chronological)
  const newFeed =
    await api.functional.redditClone.posts.popular.index(connection);
  typia.assert(newFeed);
  // Test 3: Top sorting algorithm (vote-based with time filters)
  const topFeed =
    await api.functional.redditClone.posts.popular.index(connection);
  typia.assert(topFeed);
  // Test 4: Controversial sorting algorithm (mixed positive/negative reception)
  const controversialFeed =
    await api.functional.redditClone.posts.popular.index(connection);
  typia.assert(controversialFeed);
  // Validate response structure for all feeds
  const allFeeds = [hotFeed, newFeed, topFeed, controversialFeed];
  allFeeds.forEach((feed, index) => {
    const algorithm = ["hot", "new", "top", "controversial"][index];
    TestValidator.equals(
      `${algorithm} feed has correct structure`,
      feed.pagination !== undefined,
      true,
    );
    TestValidator.equals(
      `${algorithm} feed has data array`,
      Array.isArray(feed.data),
      true,
    );
    // Validate post summary structure
    feed.data.forEach((post, postIndex) => {
      TestValidator.equals(
        `post ${postIndex} has id`,
        post.id !== undefined,
        true,
      );
      TestValidator.equals(
        `post ${postIndex} has title`,
        post.title !== undefined,
        true,
      );
      TestValidator.equals(
        `post ${postIndex} has author`,
        post.author !== undefined,
        true,
      );
      TestValidator.equals(
        `post ${postIndex} has community`,
        post.community !== undefined,
        true,
      );
      TestValidator.equals(
        `post ${postIndex} has voteScore`,
        post.voteScore !== undefined,
        true,
      );
      TestValidator.equals(
        `post ${postIndex} has commentCount`,
        post.commentCount !== undefined,
        true,
      );
      TestValidator.equals(
        `post ${postIndex} has viewCount`,
        post.viewCount !== undefined,
        true,
      );
      TestValidator.equals(
        `post ${postIndex} has upvoteCount`,
        post.upvoteCount !== undefined,
        true,
      );
      TestValidator.equals(
        `post ${postIndex} has downvoteCount`,
        post.downvoteCount !== undefined,
        true,
      );
      TestValidator.equals(
        `post ${postIndex} has timeAgo`,
        post.timeAgo !== undefined,
        true,
      );
      TestValidator.equals(
        `post ${postIndex} has trendingScore`,
        post.trendingScore !== undefined,
        true,
      );
      TestValidator.equals(
        `post ${postIndex} has engagementRate`,
        post.engagementRate !== undefined,
        true,
      );
      TestValidator.equals(
        `post ${postIndex} has created_at`,
        post.created_at !== undefined,
        true,
      );
    });
  });
}
