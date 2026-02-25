import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_analytics_sort_engagement(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // Request analytics with engagement sorting (descending)
  const request: IRedditCloneCommunity.IAnalyticsRequest = {
    sortBy: "engagement",
    sortOrder: "desc",
    limit: 10,
  };
  const response =
    await api.functional.redditClone.member.analytics.communities.statistics.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(response);
  // Validate response structure
  TestValidator.equals("pagination exists", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  // Validate sorting order - engagement rates should be in descending order
  const actualEngagementRates = response.data.map((d) => d.engagement_rate);
  for (let i = 1; i < actualEngagementRates.length; i++) {
    TestValidator.predicate(
      `engagement rate ${i} <= ${i - 1}`,
      actualEngagementRates[i] <= actualEngagementRates[i - 1],
    );
  }
  // Validate community data structure
  for (const stat of response.data) {
    TestValidator.equals("community name", typeof stat.name, "string");
    TestValidator.equals(
      "community description",
      typeof stat.description,
      "string",
    );
    TestValidator.equals("community icon_url", typeof stat.icon_url, "string");
    TestValidator.equals(
      "owner_id format",
      /^[0-9a-f-]{36}$/i.test(stat.owner_id),
      true,
    );
    TestValidator.equals(
      "owner_username",
      typeof stat.owner_username,
      "string",
    );
    TestValidator.predicate(
      "subscriber_count positive",
      stat.subscriber_count > 0,
    );
    TestValidator.predicate("post_count non-negative", stat.post_count >= 0);
    TestValidator.predicate(
      "comment_count non-negative",
      stat.comment_count >= 0,
    );
    TestValidator.predicate("vote_count non-negative", stat.vote_count >= 0);
    TestValidator.predicate(
      "engagement_rate positive",
      stat.engagement_rate > 0,
    );
  }
}
