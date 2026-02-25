import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_new_posts_analytics_with_time_range(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // Generate date range for the past 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const dateRange = {
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
  } satisfies IRedditCloneContentPost.IPeriod;
  // Call the new posts analytics endpoint with time range
  const analytics =
    await api.functional.redditClone.member.analytics.posts._new.newPostsAnalytics(
      memberConnection,
    );
  typia.assert(analytics);
  // Validate analytics structure
  TestValidator.equals("type is 'new'", analytics.type, "new");
  TestValidator.equals(
    "period matches time range",
    analytics.period.start_date,
    dateRange.start_date,
  );
  TestValidator.equals(
    "period matches time range",
    analytics.period.end_date,
    dateRange.end_date,
  );
  TestValidator.predicate(
    "totalPosts is non-negative",
    analytics.totalPosts >= 0,
  );
  // Validate postsByCommunity structure
  for (const community of analytics.postsByCommunity) {
    TestValidator.equals(
      "communityId is not empty",
      Boolean(community.communityId),
      true,
    );
    TestValidator.predicate(
      "communityName is not empty",
      Boolean(community.communityName),
    );
    TestValidator.predicate(
      "postCount is non-negative",
      community.postCount >= 0,
    );
  }
  // Validate creationRate structure
  TestValidator.predicate(
    "absolute_growth is integer",
    Number.isInteger(analytics.creationRate.absolute_growth),
  );
  TestValidator.predicate(
    "current_period_count is non-negative",
    analytics.creationRate.current_period_count >= 0,
  );
  TestValidator.predicate(
    "previous_period_count is non-negative",
    analytics.creationRate.previous_period_count >= 0,
  );
}
