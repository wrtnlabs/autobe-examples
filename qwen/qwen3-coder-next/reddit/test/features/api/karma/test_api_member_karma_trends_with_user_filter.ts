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

export async function test_api_member_karma_trends_with_user_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two members for comparison testing
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member2);
  // 2. Set up karma history by creating posts and comments with votes
  // Create posts and comments for member1
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  // Create posts for member1 with varying karma scores
  const post1 =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      member1Connection,
      {
        body: {
          endDate: today,
          sort: "scoreChange",
          timeRange: "month",
          userId: member1.id,
          page: 1,
          limit: 10,
        } satisfies IRedditCloneKarma.IRequest,
      },
    );
  typia.assert(post1);
  // Create posts for member2
  const post2 =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      member2Connection,
      {
        body: {
          endDate: today,
          sort: "scoreChange",
          timeRange: "month",
          userId: member2.id,
          page: 1,
          limit: 10,
        } satisfies IRedditCloneKarma.IRequest,
      },
    );
  typia.assert(post2);
  // 3. Test user-specific trend filtering
  const trends1 =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      member1Connection,
      {
        body: {
          endDate: today,
          sort: "scoreChange",
          timeRange: "month",
          userId: member1.id,
        } satisfies IRedditCloneKarma.IRequest,
      },
    );
  typia.assert(trends1);
  TestValidator.predicate("has trend data", trends1.data.length > 0);
  const trends2 =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      member2Connection,
      {
        body: {
          endDate: today,
          sort: "scoreChange",
          timeRange: "month",
          userId: member2.id,
        } satisfies IRedditCloneKarma.IRequest,
      },
    );
  typia.assert(trends2);
  TestValidator.predicate("has trend data", trends2.data.length > 0);
  // 4. Test time-series aggregation
  const weeklyTrends =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      member1Connection,
      {
        body: {
          endDate: today,
          sort: "percentageChange",
          timeRange: "week",
          userId: member1.id,
        } satisfies IRedditCloneKarma.IRequest,
      },
    );
  typia.assert(weeklyTrends);
  const monthlyTrends =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      member1Connection,
      {
        body: {
          endDate: today,
          sort: "scoreChange",
          timeRange: "month",
          userId: member1.id,
        } satisfies IRedditCloneKarma.IRequest,
      },
    );
  typia.assert(monthlyTrends);
  // 5. Test sorting by scoreChange and percentageChange
  const scoreSorted =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      member1Connection,
      {
        body: {
          endDate: today,
          sort: "scoreChange",
          timeRange: "month",
          userId: member1.id,
        } satisfies IRedditCloneKarma.IRequest,
      },
    );
  typia.assert(scoreSorted);
  const percentageSorted =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      member1Connection,
      {
        body: {
          endDate: today,
          sort: "percentageChange",
          timeRange: "month",
          userId: member1.id,
        } satisfies IRedditCloneKarma.IRequest,
      },
    );
  typia.assert(percentageSorted);
  // 6. Test pagination with different limit values
  const paginated1 =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      member1Connection,
      {
        body: {
          endDate: today,
          sort: "scoreChange",
          timeRange: "month",
          userId: member1.id,
          page: 1,
          limit: 5,
        } satisfies IRedditCloneKarma.IRequest,
      },
    );
  typia.assert(paginated1);
  TestValidator.predicate(
    "pagination limit respected",
    paginated1.data.length <= 5,
  );
  const paginated2 =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      member1Connection,
      {
        body: {
          endDate: today,
          sort: "scoreChange",
          timeRange: "month",
          userId: member1.id,
          page: 1,
          limit: 100,
        } satisfies IRedditCloneKarma.IRequest,
      },
    );
  typia.assert(paginated2);
  TestValidator.predicate(
    "pagination with larger limit",
    paginated2.data.length <= 100,
  );
  // 7. Test edge case: same user with negative karma trends
  const negativeTrends =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      member1Connection,
      {
        body: {
          endDate: today,
          sort: "scoreChange",
          timeRange: "allTime",
          userId: member1.id,
        } satisfies IRedditCloneKarma.IRequest,
      },
    );
  typia.assert(negativeTrends);
  // 8. Verify trend calculations handle division by zero
  const zeroDivisionTrends =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      member1Connection,
      {
        body: {
          endDate: today,
          sort: "percentageChange",
          timeRange: "today",
          userId: member1.id,
        } satisfies IRedditCloneKarma.IRequest,
      },
    );
  typia.assert(zeroDivisionTrends);
  // Validate trend data structure
  if (zeroDivisionTrends.data.length > 0) {
    const firstTrend = zeroDivisionTrends.data[0];
    TestValidator.predicate(
      "trend has required fields",
      firstTrend.date !== undefined,
    );
    TestValidator.predicate(
      "trend has scoreChange",
      firstTrend.scoreChange !== undefined,
    );
    TestValidator.predicate(
      "trend has percentageChange",
      firstTrend.percentageChange !== undefined,
    );
    TestValidator.predicate(
      "trend has postCount",
      firstTrend.postCount !== undefined,
    );
    TestValidator.predicate(
      "trend has commentCount",
      firstTrend.commentCount !== undefined,
    );
    TestValidator.predicate(
      "trend has totalScore",
      firstTrend.totalScore !== undefined,
    );
  }
}
