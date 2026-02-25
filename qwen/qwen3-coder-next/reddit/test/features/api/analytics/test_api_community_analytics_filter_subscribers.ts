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

/**
 * Test community analytics with filtering by subscriber count range.
 * Authenticated member filters communities by minimum and maximum subscriber thresholds
 * to find communities of specific sizes. Validates that filtered results only include
 * communities within the specified subscriber count range.
 */
export async function test_api_community_analytics_filter_subscribers(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Filter with minSubscribers and maxSubscribers
  const filterRequest: IRedditCloneCommunity.IAnalyticsRequest = {
    minSubscribers: 10,
    maxSubscribers: 100,
  };
  const filteredCommunities =
    await api.functional.redditClone.member.analytics.communities.statistics.index(
      memberConnection,
      {
        body: filterRequest,
      },
    );
  typia.assert(filteredCommunities);
  // 3. Validate filtered results
  filteredCommunities.data.forEach((community) => {
    TestValidator.predicate(
      "subscriber count within range",
      community.subscriber_count >= filterRequest.minSubscribers!,
    );
    TestValidator.predicate(
      "subscriber count within range",
      community.subscriber_count <= filterRequest.maxSubscribers!,
    );
  });
  // 4. Test with only minSubscribers
  const minOnlyRequest: IRedditCloneCommunity.IAnalyticsRequest = {
    minSubscribers: 100,
  };
  const minFiltered =
    await api.functional.redditClone.member.analytics.communities.statistics.index(
      memberConnection,
      {
        body: minOnlyRequest,
      },
    );
  typia.assert(minFiltered);
  minFiltered.data.forEach((community) => {
    TestValidator.predicate(
      "subscriber count >= 100",
      community.subscriber_count >= 100,
    );
  });
  // 5. Test with only maxSubscribers
  const maxOnlyRequest: IRedditCloneCommunity.IAnalyticsRequest = {
    maxSubscribers: 20,
  };
  const maxFiltered =
    await api.functional.redditClone.member.analytics.communities.statistics.index(
      memberConnection,
      {
        body: maxOnlyRequest,
      },
    );
  typia.assert(maxFiltered);
  maxFiltered.data.forEach((community) => {
    TestValidator.predicate(
      "subscriber count <= 20",
      community.subscriber_count <= 20,
    );
  });
  // 6. Test with no filters (should return all communities)
  const noFilterRequest: IRedditCloneCommunity.IAnalyticsRequest = {};
  const allCommunities =
    await api.functional.redditClone.member.analytics.communities.statistics.index(
      memberConnection,
      {
        body: noFilterRequest,
      },
    );
  typia.assert(allCommunities);
  TestValidator.predicate(
    "total communities >= filtered communities",
    allCommunities.data.length >= filteredCommunities.data.length,
  );
}
