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

export async function test_api_platform_admin_post_analytics_top_week(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as platformAdmin
  const adminConnection: api.IConnection = { host: connection.host, headers: {} };
  const authResult = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  (adminConnection.headers ??= {}).Authorization = authResult.token.access;
  // Prepare request with sortBy=top and timeFilter=week
  const request: IRedditCommunityPostCommentCount.IRequest = {
    sortBy: "top",
    timeFilter: "week",
    page: 1,
    limit: 5,
  };
  // Make the analytics call
  const result =
    await api.functional.redditCommunity.platformAdmin.analytics.posts.index(
      adminConnection,
      { body: request },
    );
  typia.assert(result);
  // Validate basic response structure
  TestValidator.equals(
    "totalPosts is non-negative",
    result.totalPosts,
    result.totalPosts,
  );
  TestValidator.equals(
    "totalVotes is non-negative",
    result.totalVotes,
    result.totalVotes,
  );
  TestValidator.predicate(
    "avgVoteScore is non-negative",
    result.avgVoteScore >= 0,
  );
  TestValidator.predicate(
    "avgCommentsPerPost is non-negative",
    result.avgCommentsPerPost >= 0,
  );
  TestValidator.equals(
    "activeCommunities is non-negative",
    result.activeCommunities,
    result.activeCommunities,
  );
  // Validate pagination
  TestValidator.equals("page is 1", request.page, 1);
  TestValidator.equals("limit is 5", request.limit, 5);
}