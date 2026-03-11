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

export async function test_api_report_analytics_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member (moderator)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a member connection using the token from authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = { Authorization: memberAuth.token.access };
  // 3. Test filtering by status: pending only
  const pendingFilter = {
    status: "pending",
    page: 1,
    limit: 20,
    granularity: "daily",
  } satisfies IRedditPlatformReport.IRequest;
  const pendingResponse =
    await api.functional.redditPlatform.member.reports.analytics.index(
      moderatorConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResponse);
  // Verify all returned reports have pending status
  for (const report of pendingResponse.data) {
    typia.assert(report);
    TestValidator.equals("pending report status", report.status, "PENDING");
  }
  // 4. Test filtering by status: resolved only
  const resolvedFilter = {
    status: "resolved",
    page: 1,
    limit: 20,
    granularity: "daily",
  } satisfies IRedditPlatformReport.IRequest;
  const resolvedResponse =
    await api.functional.redditPlatform.member.reports.analytics.index(
      moderatorConnection,
      { body: resolvedFilter },
    );
  typia.assert(resolvedResponse);
  // Verify all returned reports have resolved status
  for (const report of resolvedResponse.data) {
    typia.assert(report);
    TestValidator.equals("resolved report status", report.status, "RESOLVED");
  }
  // 5. Test pagination with different page sizes
  const largePageFilter = {
    page: 1,
    limit: 100,
    granularity: "daily",
  } satisfies IRedditPlatformReport.IRequest;
  const largePageResponse =
    await api.functional.redditPlatform.member.reports.analytics.index(
      moderatorConnection,
      { body: largePageFilter },
    );
  typia.assert(largePageResponse);
  typia.assert(largePageResponse.pagination);
  TestValidator.equals(
    "large page limit",
    largePageResponse.pagination.limit,
    100,
  );
  TestValidator.equals(
    "large page current",
    largePageResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "large page records >= 0",
    largePageResponse.pagination.records >= 0,
  );
  // 6. Test pagination with page 2
  const page2Filter = {
    page: 2,
    limit: 10,
    granularity: "daily",
  } satisfies IRedditPlatformReport.IRequest;
  const page2Response =
    await api.functional.redditPlatform.member.reports.analytics.index(
      moderatorConnection,
      { body: page2Filter },
    );
  typia.assert(page2Response);
  typia.assert(page2Response.pagination);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 10);
  // 7. Test date range filtering
  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const endDate = now;
  const dateRangeFilter = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    page: 1,
    limit: 50,
    granularity: "daily",
  } satisfies IRedditPlatformReport.IRequest;
  const dateRangeResponse =
    await api.functional.redditPlatform.member.reports.analytics.index(
      moderatorConnection,
      { body: dateRangeFilter },
    );
  typia.assert(dateRangeResponse);
  typia.assert(dateRangeResponse.pagination);
  TestValidator.equals(
    "date range page current",
    dateRangeResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "date range page limit",
    dateRangeResponse.pagination.limit,
    50,
  );
  // 8. Test empty filter (platform-wide analytics)
  const emptyFilter = {
    page: 1,
    limit: 100,
    granularity: "daily",
  } satisfies IRedditPlatformReport.IRequest;
  const emptyResponse =
    await api.functional.redditPlatform.member.reports.analytics.index(
      moderatorConnection,
      { body: emptyFilter },
    );
  typia.assert(emptyResponse);
  typia.assert(emptyResponse.pagination);
  TestValidator.equals(
    "empty filter page current",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty filter page limit",
    emptyResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "empty filter records >= 0",
    emptyResponse.pagination.records >= 0,
  );
  // 9. Test pagination metadata accuracy
  const paginationFilter = {
    page: 1,
    limit: 15,
    granularity: "daily",
  } satisfies IRedditPlatformReport.IRequest;
  const paginationResponse =
    await api.functional.redditPlatform.member.reports.analytics.index(
      moderatorConnection,
      { body: paginationFilter },
    );
  typia.assert(paginationResponse);
  typia.assert(paginationResponse.pagination);
  // Verify pages calculation: pages = Math.ceil(records / limit)
  const expectedPages = Math.ceil(
    paginationResponse.pagination.records / paginationResponse.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation accuracy",
    paginationResponse.pagination.pages,
    expectedPages,
  );
}
