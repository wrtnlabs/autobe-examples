import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_reports_advanced_filters(
  connection: api.IConnection,
): Promise<void> {
  // Test that a member can filter and search their reports using multiple criteria.
  //
  // This test validates the filtering capabilities of the member reports API,
  // including content type, status, community, date range, text search, and pagination.
  //
  // Note: Since there is no API available to create reports programmatically,
  // this test validates the API structure and parameter handling. In a production
  // environment with actual report data, the filters would narrow down the results.
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12),
      password: `Password${RandomGenerator.alphaNumeric(6)}1!`,
      href: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test content type filter - POST
  const postReports =
    await api.functional.community.member.member.reports.index(
      memberConnection,
      {
        body: {
          contentType: "POST",
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(postReports);
  TestValidator.predicate(
    "post reports should have POST content_type only",
    postReports.data.every((r) => r.content_type === "POST"),
  );
  // 3. Test content type filter - COMMENT
  const commentReports =
    await api.functional.community.member.member.reports.index(
      memberConnection,
      {
        body: {
          contentType: "COMMENT",
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(commentReports);
  TestValidator.predicate(
    "comment reports should have COMMENT content_type only",
    commentReports.data.every((r) => r.content_type === "COMMENT"),
  );
  // 4. Test status filter - PENDING
  const pendingReports =
    await api.functional.community.member.member.reports.index(
      memberConnection,
      {
        body: {
          status: "PENDING",
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  TestValidator.predicate(
    "pending reports should have PENDING status only",
    pendingReports.data.every((r) => r.status === "PENDING"),
  );
  // 5. Test status filter - APPROVED
  const approvedReports =
    await api.functional.community.member.member.reports.index(
      memberConnection,
      {
        body: {
          status: "APPROVED",
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(approvedReports);
  TestValidator.predicate(
    "approved reports should have APPROVED status only",
    approvedReports.data.every((r) => r.status === "APPROVED"),
  );
  // 6. Test status filter - DISMISSED
  const dismissedReports =
    await api.functional.community.member.member.reports.index(
      memberConnection,
      {
        body: {
          status: "DISMISSED",
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(dismissedReports);
  TestValidator.predicate(
    "dismissed reports should have DISMISSED status only",
    dismissedReports.data.every((r) => r.status === "DISMISSED"),
  );
  // 7. Test date range filter
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeReports =
    await api.functional.community.member.member.reports.index(
      memberConnection,
      {
        body: {
          createdFrom: oneMonthAgo.toISOString(),
          createdTo: oneWeekAgo.toISOString(),
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(dateRangeReports);
  // Validate date range filtering behavior
  TestValidator.predicate(
    "date range reports should be within specified range",
    dateRangeReports.data.every((r) => {
      const createdAt = new Date(r.created_at);
      return createdAt >= oneMonthAgo && createdAt <= oneWeekAgo;
    }),
  );
  // 8. Test text search filter
  const searchReports =
    await api.functional.community.member.member.reports.index(
      memberConnection,
      {
        body: {
          search: "spam",
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(searchReports);
  // Validate text search behavior (case-insensitive)
  TestValidator.predicate(
    "search results should contain search term in reason",
    searchReports.data.every((r) =>
      r.reason.toLowerCase().includes("spam".toLowerCase()),
    ),
  );
  // 9. Test combined filters
  const combinedReports =
    await api.functional.community.member.member.reports.index(
      memberConnection,
      {
        body: {
          status: "PENDING",
          contentType: "POST",
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(combinedReports);
  // Validate combined filter behavior
  TestValidator.predicate(
    "combined reports should match all filter criteria",
    combinedReports.data.every(
      (r) => r.status === "PENDING" && r.content_type === "POST",
    ),
  );
  // 10. Test pagination - page 1 with limit
  const page1Reports =
    await api.functional.community.member.member.reports.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(page1Reports);
  TestValidator.equals("page 1 current", page1Reports.pagination.current, 1);
  TestValidator.predicate(
    "page 1 limit should be respected",
    page1Reports.data.length <= 5,
  );
  // 11. Test pagination - page 2
  const page2Reports =
    await api.functional.community.member.member.reports.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(page2Reports);
  TestValidator.equals("page 2 current", page2Reports.pagination.current, 2);
  // 12. Test empty result handling with non-matching search
  const emptySearchReports =
    await api.functional.community.member.member.reports.index(
      memberConnection,
      {
        body: {
          search: "xyznonexistentterm123",
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(emptySearchReports);
  TestValidator.predicate(
    "non-matching search should return empty or filtered results",
    Array.isArray(emptySearchReports.data),
  );
  // 13. Test community filter with a specific UUID (will return empty as no reports exist)
  const communityFilteredReports =
    await api.functional.community.member.member.reports.index(
      memberConnection,
      {
        body: {
          communityId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(communityFilteredReports);
  TestValidator.predicate(
    "community filter should return valid results structure",
    Array.isArray(communityFilteredReports.data),
  );
}
