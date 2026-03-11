import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_analytics_moderator_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member account (moderator)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "12345678",
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  typia.assert(member);
  // 2. Test analytics with default filters (all communities, all statuses, daily granularity)
  const defaultAnalytics =
    await api.functional.redditPlatform.member.reports.analytics.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultAnalytics);
  TestValidator.equals(
    "default analytics has valid pagination",
    defaultAnalytics.pagination.current,
    1,
  );
  TestValidator.equals(
    "default analytics has default limit",
    defaultAnalytics.pagination.limit,
    100,
  );
  // 3. Test analytics with status filter (pending)
  const pendingAnalytics =
    await api.functional.redditPlatform.member.reports.analytics.index(
      memberConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(pendingAnalytics);
  TestValidator.equals(
    "pending analytics has valid pagination",
    pendingAnalytics.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending analytics has correct records count",
    pendingAnalytics.pagination.records,
    pendingAnalytics.data.length,
  );
  // 4. Test analytics with different granularity (weekly)
  const weeklyAnalytics =
    await api.functional.redditPlatform.member.reports.analytics.index(
      memberConnection,
      {
        body: {
          granularity: "weekly",
        },
      },
    );
  typia.assert(weeklyAnalytics);
  TestValidator.equals(
    "weekly analytics has valid pagination",
    weeklyAnalytics.pagination.current,
    1,
  );
  TestValidator.equals(
    "weekly analytics has correct records",
    weeklyAnalytics.pagination.records,
    weeklyAnalytics.data.length,
  );
  // 5. Test analytics with custom date range
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeAnalytics =
    await api.functional.redditPlatform.member.reports.analytics.index(
      memberConnection,
      {
        body: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          granularity: "daily",
        },
      },
    );
  typia.assert(dateRangeAnalytics);
  TestValidator.equals(
    "date range analytics has valid pagination",
    dateRangeAnalytics.pagination.current,
    1,
  );
  TestValidator.equals(
    "date range analytics has correct records",
    dateRangeAnalytics.pagination.records,
    dateRangeAnalytics.data.length,
  );
  // 6. Test analytics with pagination parameters
  const paginatedAnalytics =
    await api.functional.redditPlatform.member.reports.analytics.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginatedAnalytics);
  TestValidator.equals(
    "paginated analytics has correct page",
    paginatedAnalytics.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated analytics has correct limit",
    paginatedAnalytics.pagination.limit,
    10,
  );
  TestValidator.equals(
    "paginated analytics has correct records",
    paginatedAnalytics.pagination.records,
    paginatedAnalytics.data.length,
  );
}
