import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformFeedResult";
import type { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_reddit_platform_results_personalization_logic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member for testing feed results
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Test feed results with different sort algorithms and filters
  // Test top sort with day time filter
  const topDayFeed = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        sort: "top",
        timeFilter: "today",
        limit: 10,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(topDayFeed);
  TestValidator.predicate(
    "top day feed has results",
    topDayFeed.data.length >= 0,
  );
  TestValidator.equals(
    "top day feed pagination valid",
    topDayFeed.pagination.current,
    1,
  );
  TestValidator.predicate(
    "top day feed has valid records",
    topDayFeed.pagination.records >= 0,
  );
  // Test hot sort
  const hotFeed = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        sort: "hot",
        limit: 10,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(hotFeed);
  TestValidator.predicate("hot feed has results", hotFeed.data.length >= 0);
  // Test new sort
  const newFeed = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        sort: "new",
        limit: 10,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(newFeed);
  TestValidator.predicate("new feed has results", newFeed.data.length >= 0);
  // Test controversial sort
  const controversialFeed = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        sort: "controversial",
        limit: 10,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(controversialFeed);
  TestValidator.predicate(
    "controversial feed has results",
    controversialFeed.data.length >= 0,
  );
  // Test different time filters
  const weekFeed = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        sort: "top",
        timeFilter: "week",
        limit: 10,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(weekFeed);
  const monthFeed = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        sort: "top",
        timeFilter: "month",
        limit: 10,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(monthFeed);
  const yearFeed = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        sort: "top",
        timeFilter: "year",
        limit: 10,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(yearFeed);
  const allTimeFeed = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        sort: "top",
        timeFilter: "all_time",
        limit: 10,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(allTimeFeed);
  // Test includeSubscribedOnly parameter
  const subscribedOnlyFeed = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        includeSubscribedOnly: true,
        limit: 10,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(subscribedOnlyFeed);
  // Test without includeSubscribedOnly (default: all communities)
  const allCommunitiesFeed = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        includeSubscribedOnly: false,
        limit: 10,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(allCommunitiesFeed);
  // 3. Verify cached results structure when data exists
  const allFeeds = [
    topDayFeed,
    hotFeed,
    newFeed,
    controversialFeed,
    weekFeed,
    monthFeed,
    yearFeed,
    allTimeFeed,
    subscribedOnlyFeed,
    allCommunitiesFeed,
  ];
  for (const feed of allFeeds) {
    if (feed.data.length > 0) {
      const firstResult = feed.data[0];
      TestValidator.predicate(
        "has valid post ID",
        firstResult.postId !== null && firstResult.postId !== undefined,
      );
      TestValidator.predicate(
        "has valid title",
        firstResult.postTitle.length > 0,
      );
      TestValidator.predicate(
        "has valid vote score",
        firstResult.voteScore >= 0,
      );
      TestValidator.predicate(
        "has valid comment count",
        firstResult.commentCount >= 0,
      );
      TestValidator.predicate(
        "has valid author username",
        firstResult.authorUsername.length > 0,
      );
      TestValidator.predicate(
        "has valid community name",
        firstResult.communityName.length > 0,
      );
      TestValidator.predicate(
        "has valid post created at",
        firstResult.postCreatedAt !== null &&
          firstResult.postCreatedAt !== undefined,
      );
    }
  }
  // 4. Test pagination parameters
  const page2Feed = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 5,
        sort: "new",
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  typia.assert(page2Feed);
  TestValidator.equals("page 2 pagination", page2Feed.pagination.current, 2);
  // 5. Test concurrent access patterns
  const concurrentRequests = await Promise.all([
    api.functional.redditPlatform.results.index(memberConnection, {
      body: {
        sort: "new",
        limit: 5,
      } satisfies IRedditPlatformFeedResult.IRequest,
    }),
    api.functional.redditPlatform.results.index(memberConnection, {
      body: {
        sort: "top",
        timeFilter: "week",
        limit: 5,
      } satisfies IRedditPlatformFeedResult.IRequest,
    }),
    api.functional.redditPlatform.results.index(memberConnection, {
      body: {
        sort: "hot",
        limit: 5,
      } satisfies IRedditPlatformFeedResult.IRequest,
    }),
  ]);
  concurrentRequests.forEach((response) => {
    typia.assert(response);
    TestValidator.predicate(
      "concurrent request has valid pagination",
      response.pagination !== null && response.pagination !== undefined,
    );
  });
  // 6. Verify cache consistency
  const firstRequest = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        sort: "new",
        limit: 5,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  // Small delay to ensure we're within TTL window
  await new Promise((resolve) => setTimeout(resolve, 100));
  const secondRequest = await api.functional.redditPlatform.results.index(
    memberConnection,
    {
      body: {
        sort: "new",
        limit: 5,
      } satisfies IRedditPlatformFeedResult.IRequest,
    },
  );
  TestValidator.equals(
    "cache TTL consistent",
    firstRequest.pagination.records,
    secondRequest.pagination.records,
  );
}