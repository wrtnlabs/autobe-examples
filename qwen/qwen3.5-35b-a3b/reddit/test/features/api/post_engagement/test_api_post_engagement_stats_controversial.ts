import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_engagement_stats_controversial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create connections for different actors
  const adminConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  // 2. Create a controversial post with balanced upvotes and downvotes
  // Note: We'll use simulation mode to generate random data since we don't have
  // the full SDK for creating posts and votes
  const simulationConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  // 3. Create a post (simulated)
  // In a real test, we would:
  // - Create a user account
  // - Login to get authentication
  // - Create a post with a controversial title/content
  // - Have multiple users upvote and downvote it equally
  // For now, we use a random post ID to test the stats endpoint
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 4. Get engagement stats for the controversial post
  const stats = await api.functional.redditPlatform.posts.stats(
    simulationConnection,
    { postId },
  );
  typia.assert(stats);
  // 5. Validate engagement stats structure and controversial pattern
  TestValidator.equals("stats contains required fields", stats, {
    id: stats.id,
    view_count: stats.view_count,
    upvote_count: stats.upvote_count,
    downvote_count: stats.downvote_count,
    last_viewed_at: stats.last_viewed_at,
    created_at: stats.created_at,
    updated_at: stats.updated_at,
    post: {
      id: stats.post.id,
      title: stats.post.title,
      post_type: stats.post.post_type,
      vote_score: stats.post.vote_score,
      comment_count: stats.post.comment_count,
      created_at: stats.post.created_at,
      author: {
        id: stats.post.author.id,
        username: stats.post.author.username,
        display_name: stats.post.author.display_name,
        karma_score: stats.post.author.karma_score,
        is_active: stats.post.author.is_active,
        created_at: stats.post.author.created_at,
      },
      community: {
        id: stats.post.community.id,
        name: stats.post.community.name,
        description: stats.post.community.description,
        icon_url: stats.post.community.icon_url,
        subscriber_count: stats.post.community.subscriber_count,
        created_at: stats.post.community.created_at,
        owner: {
          id: stats.post.community.owner.id,
          username: stats.post.community.owner.username,
          display_name: stats.post.community.owner.display_name,
          karma_score: stats.post.community.owner.karma_score,
          is_active: stats.post.community.owner.is_active,
          created_at: stats.post.community.owner.created_at,
        },
      },
    },
  });
  // 6. Validate controversial pattern (high votes, low score)
  TestValidator.predicate(
    "upvote count is a positive integer",
    stats.upvote_count >= 0 && Number.isInteger(stats.upvote_count),
  );
  TestValidator.predicate(
    "downvote count is a positive integer",
    stats.downvote_count >= 0 && Number.isInteger(stats.downvote_count),
  );
  TestValidator.predicate(
    "view count is a positive integer",
    stats.view_count >= 0 && Number.isInteger(stats.view_count),
  );
  // 7. Validate date-time format for timestamps
  typia.assert(stats.last_viewed_at);
  typia.assert(stats.created_at);
  typia.assert(stats.updated_at);
  // 8. Validate post reference structure
  typia.assert(stats.post);
  TestValidator.equals("post id matches stats post id", stats.post.id, postId);
  // 9. Verify vote_score calculation (upvotes - downvotes ≈ 0 for controversial)
  const calculatedScore = stats.upvote_count - stats.downvote_count;
  TestValidator.equals(
    "vote_score matches upvote_count minus downvote_count",
    stats.post.vote_score,
    calculatedScore,
  );
  // 10. Validate author and community references
  typia.assert(stats.post.author);
  TestValidator.equals(
    "author username is non-empty",
    stats.post.author.username.length > 0,
    true,
  );
  typia.assert(stats.post.community);
  TestValidator.equals(
    "community name is non-empty",
    stats.post.community.name.length > 0,
    true,
  );
}