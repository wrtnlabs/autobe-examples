import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import type { ICommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReportResolution";
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
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_reports_create } from "../../../generate/generate_random_community_member_reports_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";

export async function test_api_moderation_report_queue_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create community owner (who becomes moderator)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create community
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  // 3. Create multiple posts in the community for reporting
  const posts = await ArrayUtil.asyncRepeat(5, async () => {
    return await generate_random_community_member_communities_posts_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { post_type: "TEXT" },
      },
    );
  });
  // 4. Create reporter member
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {});
  // 5. Capture timestamp before creating reports for date range test
  const beforeReports = new Date().toISOString();
  // 6. Create reports with different content types and reasons
  const reportReasons = [
    "Spam content that violates community rules",
    "Harassment and abusive language detected",
    "Off-topic discussion in serious thread",
    "Misinformation and false claims posted",
    "Copyright violation - stolen content",
  ];
  const reports = await ArrayUtil.asyncMap(posts, async (post, index) => {
    return await generate_random_community_member_reports_create(
      reporterConnection,
      {
        body: {
          content_type: "POST",
          content_id: post.id,
          reason:
            reportReasons[index] ?? RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  });
  // 7. Capture timestamp after creating reports
  const afterReports = new Date().toISOString();
  // Test 1: Retrieve all reports and validate structure
  const allReports =
    await api.functional.community.member.communities.reports.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {},
      },
    );
  typia.assert(allReports);
  TestValidator.predicate("has reports", allReports.data.length >= 5);
  TestValidator.predicate(
    "pagination has current page",
    allReports.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    allReports.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records",
    allReports.pagination.records >= 5,
  );
  // Test 2: Validate report summary structure
  const sampleReport = allReports.data[0];
  typia.assert(sampleReport);
  TestValidator.predicate("report has id", sampleReport.id !== undefined);
  TestValidator.predicate(
    "report has content_type",
    sampleReport.content_type === "POST",
  );
  TestValidator.predicate(
    "report has content_id",
    sampleReport.content_id !== undefined,
  );
  TestValidator.predicate("report has reason", sampleReport.reason.length > 0);
  TestValidator.predicate(
    "report has status",
    sampleReport.status === "PENDING",
  );
  TestValidator.predicate(
    "report has created_at",
    sampleReport.created_at !== undefined,
  );
  TestValidator.predicate(
    "report has updated_at",
    sampleReport.updated_at !== undefined,
  );
  // Test 3: Validate reporter embedded object
  TestValidator.predicate(
    "report has reporter",
    sampleReport.reporter !== undefined,
  );
  TestValidator.predicate(
    "reporter has id",
    sampleReport.reporter.id !== undefined,
  );
  TestValidator.predicate(
    "reporter has username",
    sampleReport.reporter.username !== undefined,
  );
  TestValidator.predicate(
    "reporter has karma",
    typeof sampleReport.reporter.karma === "number",
  );
  TestValidator.predicate(
    "reporter has createdAt",
    sampleReport.reporter.createdAt !== undefined,
  );
  // Test 4: Validate community embedded object
  TestValidator.predicate(
    "report has community",
    sampleReport.community !== undefined,
  );
  TestValidator.predicate(
    "community has id",
    sampleReport.community.id !== undefined,
  );
  TestValidator.predicate(
    "community has name",
    sampleReport.community.name === community.name,
  );
  TestValidator.predicate(
    "community has subscriber_count",
    typeof sampleReport.community.subscriber_count === "number",
  );
  // Test 5: Filter by status PENDING
  const pendingReports =
    await api.functional.community.member.communities.reports.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { status: "PENDING" },
      },
    );
  typia.assert(pendingReports);
  TestValidator.predicate(
    "all reports are PENDING",
    pendingReports.data.every((r) => r.status === "PENDING"),
  );
  // Test 6: Filter by content_type POST
  const postReports =
    await api.functional.community.member.communities.reports.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { contentType: "POST" },
      },
    );
  typia.assert(postReports);
  TestValidator.predicate(
    "all reports are POST type",
    postReports.data.every((r) => r.content_type === "POST"),
  );
  // Test 7: Search by reason text - find "Spam"
  const spamSearchResults =
    await api.functional.community.member.communities.reports.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { search: "Spam" },
      },
    );
  typia.assert(spamSearchResults);
  TestValidator.predicate(
    "search finds spam report",
    spamSearchResults.data.some((r) => r.reason.includes("Spam")),
  );
  // Test 8: Search by reason text - find "Harassment"
  const harassmentSearchResults =
    await api.functional.community.member.communities.reports.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { search: "Harassment" },
      },
    );
  typia.assert(harassmentSearchResults);
  TestValidator.predicate(
    "search finds harassment report",
    harassmentSearchResults.data.some((r) => r.reason.includes("Harassment")),
  );
  // Test 9: Date range filtering - createdFrom
  const fromDateResults =
    await api.functional.community.member.communities.reports.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { createdFrom: beforeReports },
      },
    );
  typia.assert(fromDateResults);
  TestValidator.predicate(
    "date filter returns reports",
    fromDateResults.data.length >= 5,
  );
  // Test 10: Date range filtering - createdTo
  const toDateResults =
    await api.functional.community.member.communities.reports.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { createdTo: afterReports },
      },
    );
  typia.assert(toDateResults);
  TestValidator.predicate(
    "date filter to returns reports",
    toDateResults.data.length >= 5,
  );
  // Test 11: Date range filtering - both from and to
  const dateRangeResults =
    await api.functional.community.member.communities.reports.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { createdFrom: beforeReports, createdTo: afterReports },
      },
    );
  typia.assert(dateRangeResults);
  TestValidator.predicate(
    "date range filter returns reports",
    dateRangeResults.data.length >= 5,
  );
  // Test 12: Pagination - first page with limit
  const page1 = await api.functional.community.member.communities.reports.index(
    ownerConnection,
    {
      communityName: community.name,
      body: { page: 1, limit: 2 },
    },
  );
  typia.assert(page1);
  TestValidator.predicate("page 1 has max 2 items", page1.data.length <= 2);
  TestValidator.equals("pagination current is 1", page1.pagination.current, 1);
  TestValidator.equals("pagination limit is 2", page1.pagination.limit, 2);
  // Test 13: Pagination - second page
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.community.member.communities.reports.index(
        ownerConnection,
        {
          communityName: community.name,
          body: { page: 2, limit: 2 },
        },
      );
    typia.assert(page2);
    TestValidator.equals(
      "pagination current is 2",
      page2.pagination.current,
      2,
    );
    TestValidator.predicate(
      "page 1 and page 2 have different reports",
      page1.data.length === 0 ||
        page2.data.length === 0 ||
        page1.data[0].id !== page2.data[0].id,
    );
  }
  // Test 14: Combined filters - status and content_type
  const combinedFilters =
    await api.functional.community.member.communities.reports.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { status: "PENDING", contentType: "POST" },
      },
    );
  typia.assert(combinedFilters);
  TestValidator.predicate(
    "combined filter - all pending and post type",
    combinedFilters.data.every(
      (r) => r.status === "PENDING" && r.content_type === "POST",
    ),
  );
  // Test 15: Combined filters - search and status
  const searchAndStatus =
    await api.functional.community.member.communities.reports.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { status: "PENDING", search: "violation" },
      },
    );
  typia.assert(searchAndStatus);
  TestValidator.predicate(
    "combined search and status",
    searchAndStatus.data.every(
      (r) =>
        r.status === "PENDING" && r.reason.toLowerCase().includes("violation"),
    ),
  );
}
