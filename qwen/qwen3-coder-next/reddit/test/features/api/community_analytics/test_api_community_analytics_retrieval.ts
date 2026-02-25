import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_community_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthorized = await authorize_guest_join(guestConnection, {
    body: {
      session_token: typia.random<string & tags.Format<"uuid">>(),
      device_id: typia.random<string & tags.Format<"uuid">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: null,
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(guestAuthorized);
  // 2. Prepare analytics request with filtering and sorting options
  const analyticsRequest: IRedditCloneCommunity.IAnalyticsRequest = {
    search: "test",
    minSubscribers: 10,
    maxSubscribers: 1000,
    minPosts: 5,
    minComments: 20,
    minVotes: 100,
    timeRange: "allTime",
    sortBy: "subscribers",
    sortOrder: "desc",
    page: 1,
    limit: 20,
  };
  // 3. Retrieve community analytics statistics
  const output: IPageIRedditCloneCommunity.IStatistic =
    await api.functional.redditClone.guest.analytics.communities.statistics.index(
      guestConnection,
      {
        body: analyticsRequest,
      },
    );
  typia.assert(output);
  // 4. Validate response structure
  TestValidator.equals("pagination exists", output.pagination, {
    current: 1,
    limit: 20,
    records: 0,
    pages: 0,
  });
  // 5. Validate data array structure if communities exist
  TestValidator.predicate("data array exists", Array.isArray(output.data));
  if (output.data.length > 0) {
    const firstCommunity = output.data[0];
    typia.assert(firstCommunity);
    // Validate community statistics structure
    TestValidator.equals(
      "community has id",
      typeof firstCommunity.community.id,
      "string",
    );
    TestValidator.equals(
      "community has name",
      typeof firstCommunity.name,
      "string",
    );
    TestValidator.equals(
      "community has description",
      typeof firstCommunity.description,
      "string",
    );
    TestValidator.equals(
      "community has icon_url",
      typeof firstCommunity.icon_url,
      "string",
    );
    TestValidator.equals(
      "community has owner_id",
      typeof firstCommunity.owner_id,
      "string",
    );
    TestValidator.equals(
      "community has owner_username",
      typeof firstCommunity.owner_username,
      "string",
    );
    TestValidator.predicate(
      "subscriber_count is positive integer",
      firstCommunity.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "post_count is positive integer",
      firstCommunity.post_count >= 0,
    );
    TestValidator.predicate(
      "comment_count is positive integer",
      firstCommunity.comment_count >= 0,
    );
    TestValidator.predicate(
      "vote_count is positive integer",
      firstCommunity.vote_count >= 0,
    );
    TestValidator.predicate(
      "engagement_rate is non-negative",
      firstCommunity.engagement_rate >= 0,
    );
    TestValidator.predicate(
      "activity_score is non-negative integer",
      firstCommunity.activity_score >= 0,
    );
  }
}
