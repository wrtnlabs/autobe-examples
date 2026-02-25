import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_admin_analytics_voting_metrics_performance_scaling(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Create multiple users for voting activity
  const userConnections: api.IConnection[] = [];
  for (let i = 0; i < 10; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "user123",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies ICommunityPlatformUser.IJoin,
    });
    userConnections.push(userConnection);
  }
  // Create communities
  const communities = await Promise.all(
    ArrayUtil.repeat(3, async () => {
      const randomUser = RandomGenerator.pick(userConnections);
      return await generate_random_community_platform_user_communities_create(
        randomUser,
        {
          body: {
            name: RandomGenerator.alphaNumeric(10),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    }),
  );
  // Generate substantial post content
  const posts = await Promise.all(
    ArrayUtil.repeat(20, async () => {
      const randomUser = RandomGenerator.pick(userConnections);
      const randomCommunity = RandomGenerator.pick(communities);
      return await generate_random_community_platform_user_posts_create(
        randomUser,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            community_name: randomCommunity.name,
            post_type: "text",
            text_content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    }),
  );
  // Simulate high-volume voting activity across different time periods
  const votes = await Promise.all(
    ArrayUtil.repeat(50, async () => {
      const randomUser = RandomGenerator.pick(userConnections);
      const randomPost = RandomGenerator.pick(posts);
      const voteType = RandomGenerator.pick(["upvote", "downvote"] as const);
      return await generate_random_community_platform_user_posts_votes_create(
        randomUser,
        {
          params: { postId: randomPost.id },
          body: {
            vote_type: voteType,
          } satisfies ICommunityPlatformPostVote.ICreate,
        },
      );
    }),
  );
  // Call analytics endpoint to retrieve voting metrics
  const analytics =
    await api.functional.communityPlatform.admin.analytics.voting_metrics.index(
      adminConnection,
    );
  typia.assert(analytics);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof analytics.pagination,
    "object",
  );
  TestValidator.predicate(
    "has current page",
    analytics.pagination.current >= 0,
  );
  TestValidator.predicate("has limit", analytics.pagination.limit > 0);
  TestValidator.predicate(
    "has records count",
    analytics.pagination.records >= 0,
  );
  TestValidator.predicate("has pages count", analytics.pagination.pages >= 0);
  // Validate metrics aggregation
  if (analytics.data.length > 0) {
    const metric = analytics.data[0];
    TestValidator.predicate(
      "has vote submission count",
      metric.vote_submission_count >= 0,
    );
    TestValidator.predicate("has upvote count", metric.upvote_count >= 0);
    TestValidator.predicate("has downvote count", metric.downvote_count >= 0);
    TestValidator.predicate("has karma impact", metric.karma_impact_total >= 0);
    TestValidator.predicate("has error tracking", metric.error_count >= 0);
    TestValidator.predicate("has rate limiting", metric.rate_limit_hits >= 0);
    // Validate period-based analytics
    TestValidator.predicate(
      "has valid period type",
      ["hourly", "daily", "weekly", "monthly"].includes(metric.period_type),
    );
    TestValidator.predicate(
      "has period start",
      new Date(metric.period_start) instanceof Date,
    );
    TestValidator.predicate(
      "has period end",
      new Date(metric.period_end) instanceof Date,
    );
  }
  // Test business logic validation
  TestValidator.predicate(
    "analytics data is array",
    Array.isArray(analytics.data),
  );
  TestValidator.predicate(
    "pagination matches data length",
    analytics.data.length <= analytics.pagination.limit,
  );
}
