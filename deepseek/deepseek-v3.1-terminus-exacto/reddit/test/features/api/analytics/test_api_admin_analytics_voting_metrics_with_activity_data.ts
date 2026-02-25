import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteKarmaImpact";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

/**
 * Test analytics endpoint returns meaningful data when voting activity exists.
 * Create voting transactions by having regular users vote on content, then verify
 * the admin analytics endpoint captures this activity. Test that metrics include
 * upvote/downvote ratios, karma impact calculations, and vote processing statistics.
 * Validate that time-based aggregation works correctly with period_start and period_end
 * timestamps. Verify that performance metrics reflect actual vote processing duration
 * and system resource utilization.
 */
export async function test_api_admin_analytics_voting_metrics_with_activity_data(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create multiple regular users
  const userConnections: api.IConnection[] = ArrayUtil.repeat(3, (index) => ({
    host: connection.host,
  }));
  const users = await Promise.all(
    userConnections.map(async (userConnection) => {
      return await authorize_user_join(userConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          username: RandomGenerator.alphaNumeric(12),
        } satisfies ICommunityPlatformUser.IJoin,
      });
    }),
  );
  // Create community using first user (already authenticated via authorize_user_join)
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnections[0],
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<ICommunityPlatformCommunity.ICreate>,
      },
    );
  // Create multiple posts using different users
  const posts = await Promise.all(
    userConnections.map(async (userConnection) => {
      return await generate_random_community_platform_user_posts_create(
        userConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            community_name: community.name,
            post_type: "text",
            text_content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies DeepPartial<ICommunityPlatformPost.ICreate>,
        },
      );
    }),
  );
  // Generate voting transactions - each user votes on posts created by other users
  const voteTypes = ["upvote", "downvote"] as const;
  const votesPromises = userConnections.flatMap((userConnection, userIndex) =>
    posts
      .filter((_, postIndex) => userIndex !== postIndex) // Users don't vote on their own posts
      .map(async (post) => {
        const voteType = RandomGenerator.pick(voteTypes);
        return await generate_random_community_platform_user_posts_votes_create(
          userConnection,
          {
            params: { postId: post.id },
            body: {
              vote_type: voteType,
            } satisfies DeepPartial<ICommunityPlatformPostVote.ICreate>,
          },
        );
      }),
  );
  const votes = await Promise.all(votesPromises);
  // Call admin analytics endpoint
  const analytics =
    await api.functional.communityPlatform.admin.analytics.voting_metrics.index(
      adminConnection,
    );
  typia.assert(analytics);
  // Validate analytics data
  TestValidator.predicate(
    "analytics should contain data",
    analytics.data.length > 0,
  );
  // Calculate expected vote counts from our generated activity
  const totalVotes = votes.length;
  const upvotes = votes.filter((vote) => vote.vote_type === "upvote").length;
  const downvotes = votes.filter(
    (vote) => vote.vote_type === "downvote",
  ).length;
  // Find the most recent analytics record (should contain our activity)
  const latestAnalytics = analytics.data[analytics.data.length - 1];
  TestValidator.predicate(
    "vote submission count should reflect activity",
    latestAnalytics.vote_submission_count >= totalVotes,
  );
  TestValidator.predicate(
    "upvote count should be captured",
    latestAnalytics.upvote_count >= upvotes,
  );
  TestValidator.predicate(
    "downvote count should be captured",
    latestAnalytics.downvote_count >= downvotes,
  );
  TestValidator.predicate(
    "vote ratio should be calculated",
    latestAnalytics.vote_ratio >= 0 && latestAnalytics.vote_ratio <= 1,
  );
  TestValidator.predicate(
    "karma impact should be calculated",
    latestAnalytics.karma_impact_total >= 0,
  );
  TestValidator.predicate(
    "performance metrics should be present",
    latestAnalytics.vote_submission_avg_time_ms >= 0 &&
      latestAnalytics.karma_calculation_avg_time_ms >= 0,
  );
  TestValidator.predicate(
    "time-based aggregation should work",
    latestAnalytics.period_start <= latestAnalytics.period_end,
  );
  TestValidator.predicate(
    "analytics record should have valid timestamp",
    new Date(latestAnalytics.created_at).getTime() > 0,
  );
}
