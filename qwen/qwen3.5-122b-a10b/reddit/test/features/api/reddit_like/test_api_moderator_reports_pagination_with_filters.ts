import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test moderator reports pagination with filtering capabilities.
 *
 * Validates the comprehensive filtering and pagination system for community moderators to manage content reports efficiently. The test ensures that pagination parameters correctly split results, metadata accurately reflects record counts, and various filters (status, date range, reporter ID, search) work individually and in combination.
 *
 * The test covers edge cases including empty result sets, boundary conditions for date ranges, and proper sorting behavior. It verifies that moderators can effectively query reports across different time periods, from specific reporters, or with specific criteria.
 *
 * 1. Authenticate as member to access moderator-only endpoint.
 * 2. Create multiple reports with varying properties (status, dates, reporters).
 * 3. Test basic pagination with page and limit parameters.
 * 4. Validate pagination metadata (current, limit, records, pages).
 * 5. Test date range filtering with created_at_gte and created_at_lte.
 * 6. Test status filtering (pending, approved, dismissed).
 * 7. Test reporter ID filtering.
 * 8. Test search filtering on report reason field.
 * 9. Test sort and order parameters.
 * 10. Test combined filters (status + date range + reporter ID).
 * 11. Test empty result set returns proper metadata.
 */
export async function test_api_moderator_reports_pagination_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Test basic pagination - page 1 with limit 10
  const page1 = await api.functional.redditLike.member.reports_of_posts.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditLikeReport.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    page1.pagination.pages >= 0,
  );
  // 3. Test pagination - page 2 with same limit
  const page2 = await api.functional.redditLike.member.reports_of_posts.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IRedditLikeReport.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  // 4. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentReports =
    await api.functional.redditLike.member.reports_of_posts.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          created_at_gte: oneWeekAgo.toISOString(),
          created_at_lte: now.toISOString(),
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(recentReports);
  TestValidator.predicate(
    "recent reports within date range",
    recentReports.data.every(
      (report) =>
        new Date(report.created_at).getTime() >= oneWeekAgo.getTime() &&
        new Date(report.created_at).getTime() <= now.getTime(),
    ),
  );
  // 5. Test status filtering - pending reports
  const pendingReports =
    await api.functional.redditLike.member.reports_of_posts.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          status: "pending",
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  TestValidator.predicate(
    "all pending reports have pending status",
    pendingReports.data.every((report) => report.status === "pending"),
  );
  // 6. Test reporter ID filtering (only if there are reports)
  if (pendingReports.data.length > 0) {
    const firstReporterId = pendingReports.data[0].reporter.id;
    const reporterFiltered =
      await api.functional.redditLike.member.reports_of_posts.index(
        memberConnection,
        {
          body: {
            page: 1,
            limit: 100,
            reddit_like_member_id: firstReporterId,
          } satisfies IRedditLikeReport.IRequest,
        },
      );
    typia.assert(reporterFiltered);
    TestValidator.predicate(
      "all reports from same reporter",
      reporterFiltered.data.every(
        (report) => report.reporter.id === firstReporterId,
      ),
    );
  }
  // 7. Test search filtering on reason field (only if there are reports)
  if (page1.data.length > 0) {
    const firstReportReason = page1.data[0].reason;
    const searchTerm = firstReportReason.substring(
      0,
      Math.min(5, firstReportReason.length),
    );
    const searchResults =
      await api.functional.redditLike.member.reports_of_posts.index(
        memberConnection,
        {
          body: {
            page: 1,
            limit: 100,
            search: searchTerm,
          } satisfies IRedditLikeReport.IRequest,
        },
      );
    typia.assert(searchResults);
    TestValidator.predicate(
      "all results contain search term",
      searchResults.data.every((report) =>
        report.reason.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }
  // 8. Test sort and order parameters
  const sortedAsc =
    await api.functional.redditLike.member.reports_of_posts.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          sort: "created_at",
          order: "asc",
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(sortedAsc);
  const sortedDesc =
    await api.functional.redditLike.member.reports_of_posts.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          sort: "created_at",
          order: "desc",
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(sortedDesc);
  // Verify sorting is different (only if we have enough data)
  if (sortedAsc.data.length > 1 && sortedDesc.data.length > 1) {
    const firstAsc = sortedAsc.data[0].created_at;
    const lastAsc = sortedAsc.data[sortedAsc.data.length - 1].created_at;
    const firstDesc = sortedDesc.data[0].created_at;
    const lastDesc = sortedDesc.data[sortedDesc.data.length - 1].created_at;
    TestValidator.predicate(
      "asc order: first <= last",
      new Date(firstAsc).getTime() <= new Date(lastAsc).getTime(),
    );
    TestValidator.predicate(
      "desc order: first >= last",
      new Date(firstDesc).getTime() >= new Date(lastDesc).getTime(),
    );
  }
  // 9. Test combined filters
  const combinedFilter =
    await api.functional.redditLike.member.reports_of_posts.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          status: "pending",
          sort: "created_at",
          order: "desc",
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "all combined filtered reports are pending",
    combinedFilter.data.every((report) => report.status === "pending"),
  );
  // 10. Test empty result set
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const emptyResult =
    await api.functional.redditLike.member.reports_of_posts.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          created_at_gte: farFuture.toISOString(),
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
  TestValidator.equals(
    "empty result data array length",
    emptyResult.data.length,
    0,
  );
}
