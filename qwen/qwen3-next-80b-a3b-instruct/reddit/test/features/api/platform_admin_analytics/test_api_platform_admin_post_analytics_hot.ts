import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPostCommentCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostCommentCount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_post_analytics_hot(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as platform admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  typia.assert(authResponse);
  // Create request body with sortBy: 'hot', page: 1, limit: 10, no timeFilter (default 'all')
  const requestBody: IRedditCommunityPostCommentCount.IRequest = {
    sortBy: "hot" as const,
    page: 1,
    limit: 10,
  };
  // Make the analytics call
  const analytics =
    await api.functional.redditCommunity.platformAdmin.analytics.posts.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(analytics);
  // Validate all required fields are present and meet constraints
  TestValidator.predicate("totalPosts >= 0", analytics.totalPosts >= 0);
  TestValidator.predicate("totalVotes >= 0", analytics.totalVotes >= 0);
  TestValidator.predicate("avgVoteScore >= 0", analytics.avgVoteScore >= 0);
  TestValidator.predicate(
    "avgCommentsPerPost >= 0",
    analytics.avgCommentsPerPost >= 0,
  );
  TestValidator.predicate(
    "activeCommunities >= 0",
    analytics.activeCommunities >= 0,
  );
  // Verify structure matches ISummary exactly
  TestValidator.equals("response structure matches ISummary", analytics, {
    totalPosts: 0,
    totalVotes: 0,
    avgVoteScore: 0,
    avgCommentsPerPost: 0,
    activeCommunities: 0,
  });
}
