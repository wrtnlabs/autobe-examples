import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneKarma";
import type { IRedditCloneKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarma";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_karma_trends_time_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
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
  // 2. Test with allTime time range
  const allTimeResult =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      memberConnection,
      {
        body: {
          endDate: new Date().toISOString().split("T")[0],
          sort: "scoreChange",
          timeRange: "allTime",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(allTimeResult);
  // 3. Test with today time range
  const todayResult =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      memberConnection,
      {
        body: {
          endDate: new Date().toISOString().split("T")[0],
          sort: "percentageChange",
          timeRange: "today",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(todayResult);
  // 4. Test with week time range
  const weekResult =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      memberConnection,
      {
        body: {
          endDate: new Date().toISOString().split("T")[0],
          sort: "scoreChange",
          timeRange: "week",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(weekResult);
  // 5. Test with month time range
  const monthResult =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      memberConnection,
      {
        body: {
          endDate: new Date().toISOString().split("T")[0],
          sort: "percentageChange",
          timeRange: "month",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(monthResult);
  // 6. Test with year time range
  const yearResult =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      memberConnection,
      {
        body: {
          endDate: new Date().toISOString().split("T")[0],
          sort: "scoreChange",
          timeRange: "year",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(yearResult);
  // 7. Test pagination with limit
  const paginatedResult =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      memberConnection,
      {
        body: {
          endDate: new Date().toISOString().split("T")[0],
          sort: "scoreChange",
          timeRange: "allTime",
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(paginatedResult);
  // 8. Test sorting by scoreChange
  const scoreChangeResult =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      memberConnection,
      {
        body: {
          endDate: new Date().toISOString().split("T")[0],
          sort: "scoreChange",
          timeRange: "allTime",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(scoreChangeResult);
  // 9. Test sorting by percentageChange
  const percentageChangeResult =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      memberConnection,
      {
        body: {
          endDate: new Date().toISOString().split("T")[0],
          sort: "percentageChange",
          timeRange: "allTime",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(percentageChangeResult);
  // 10. Test with future endDate (should handle gracefully)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const futureDateResult =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      memberConnection,
      {
        body: {
          endDate: futureDate.toISOString().split("T")[0],
          sort: "scoreChange",
          timeRange: "today",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(futureDateResult);
  // 11. Test response structure validation
  if (allTimeResult.data.length > 0) {
    const firstItem = allTimeResult.data[0];
    TestValidator.predicate("has date field", firstItem.date !== undefined);
    TestValidator.predicate(
      "has scoreChange field",
      firstItem.scoreChange !== undefined,
    );
    TestValidator.predicate(
      "has percentageChange field",
      firstItem.percentageChange !== undefined,
    );
    TestValidator.predicate(
      "has postCount field",
      firstItem.postCount !== undefined,
    );
    TestValidator.predicate(
      "has commentCount field",
      firstItem.commentCount !== undefined,
    );
    TestValidator.predicate(
      "has totalScore field",
      firstItem.totalScore !== undefined,
    );
  }
  // 12. Test pagination structure
  TestValidator.predicate(
    "pagination has current field",
    allTimeResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit field",
    allTimeResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records field",
    allTimeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages field",
    allTimeResult.pagination.pages >= 0,
  );
}
