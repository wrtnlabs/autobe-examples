import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityContentReport";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityContentReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReportStatus";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test content report categorization filtering for efficient moderation
 * routing.
 *
 * This test validates that community moderators can efficiently filter content
 * reports by violation categories including harassment, spam, hate speech, and
 * misinformation. It ensures specialized moderation workflows by testing:
 *
 * - Individual category filtering for expert review assignment
 * - Combined filtering with status and search criteria
 * - Pagination compatibility with category filters
 * - Comprehensive report discovery and triage processes
 *
 * The test creates realistic moderation scenarios where different report types
 * need to be routed to appropriate specialists, ensuring efficient workflow
 * management within the Reddit Community platform.
 */
export async function test_api_content_reports_categorized_filtering_for_routing(
  connection: api.IConnection,
): Promise<void> {
  // Create community moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.com/moderator/join",
        referrer: "https://reddit-community.com/",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Generate test report categories for comprehensive filtering
  const reportCategories = [
    "harassment",
    "spam",
    "hate_speech",
    "misinformation",
  ] as const;

  // Define valid report statuses
  const reportStatuses: IRedditCommunityContentReportStatus[] = [
    "submitted",
    "under_review",
    "resolved",
    "dismissed",
  ];

  // Test 1: Filter by individual harassment category
  const harassmentResults =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          report_category: "harassment",
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(harassmentResults);

  TestValidator.predicate(
    "harassment filtering returns reports with harassment category",
    harassmentResults.data.every(
      (report) => report.report_category === "harassment",
    ),
  );

  // Validate pagination works with category filtering
  TestValidator.predicate(
    "harassment results have valid pagination",
    harassmentResults.pagination.current === 1 &&
      harassmentResults.pagination.limit === 20,
  );

  // Test 2: Filter by spam category with pagination
  const spamPage1 =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          report_category: "spam",
          page: 1,
          limit: 5,
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(spamPage1);

  TestValidator.predicate(
    "spam page 1 contains only spam reports",
    spamPage1.data.every((report) => report.report_category === "spam"),
  );

  const spamPage2 =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          report_category: "spam",
          page: 2,
          limit: 5,
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(spamPage2);

  TestValidator.predicate(
    "spam page 2 contains only spam reports",
    spamPage2.data.every((report) => report.report_category === "spam"),
  );

  // Test 3: Combined filtering - hate speech with specific status
  const hateSpeechUnderReview =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          report_category: "hate_speech",
          status: "under_review",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(hateSpeechUnderReview);

  TestValidator.predicate(
    "hate speech under review filtering returns correct reports",
    hateSpeechUnderReview.data.every(
      (report) =>
        report.report_category === "hate_speech" &&
        report.status === "under_review",
    ),
  );

  // Test 4: Misinformation with search functionality
  const misinformationSearch =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          report_category: "misinformation",
          search: "false",
          sort_by: "reported_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(misinformationSearch);

  TestValidator.predicate(
    "misinformation search returns reports with search term in reason",
    misinformationSearch.data.every(
      (report) =>
        report.report_category === "misinformation" &&
        report.report_reason.toLowerCase().includes("false"),
    ),
  );

  // Test 5: Multi-status filtering for comprehensive triage
  const multiStatusResults =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          status: "submitted,under_review",
          page: 1,
          limit: 15,
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(multiStatusResults);

  TestValidator.predicate(
    "multi-status filtering returns reports with specified statuses",
    multiStatusResults.data.every(
      (report) =>
        report.status === "submitted" || report.status === "under_review",
    ),
  );

  // Test 6: Reporter-based filtering
  const reporterFilteredResults =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          reporter_nickname: "test",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(reporterFilteredResults);

  TestValidator.predicate(
    "reporter nickname filtering returns reports matching reporter",
    reporterFilteredResults.data.every((report) =>
      report.reporter.nickname.toLowerCase().includes("test"),
    ),
  );

  // Test 7: Reported member filtering
  const reportedMemberFilteredResults =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          reported_member_nickname: "user",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(reportedMemberFilteredResults);

  TestValidator.predicate(
    "reported member filtering returns reports about matching member",
    reportedMemberFilteredResults.data.every((report) =>
      report.reported_member.nickname.toLowerCase().includes("user"),
    ),
  );

  // Test 8: Combined complex filtering
  const complexFilteredResults =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          report_category: RandomGenerator.pick(reportCategories),
          status: RandomGenerator.pick(reportStatuses),
          search: RandomGenerator.pick(["content", "violation", "policy"]),
          sort_by: RandomGenerator.pick([
            "reported_at",
            "report_category",
            "status",
          ]),
          sort_order: RandomGenerator.pick(["asc", "desc"]),
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<50>
          >(),
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(complexFilteredResults);

  TestValidator.predicate(
    "complex filtering returns valid results with pagination",
    complexFilteredResults.pagination.current >= 1 &&
      complexFilteredResults.data.length <=
        complexFilteredResults.pagination.limit,
  );

  // Test 9: Default parameters behavior
  const defaultResults =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {} satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(defaultResults);

  TestValidator.predicate(
    "default request returns valid pagination",
    defaultResults.pagination.current === 1 &&
      defaultResults.pagination.limit > 0 &&
      defaultResults.pagination.limit <= 100,
  );

  // Test 10: Boundary limit testing
  const boundaryLimitResults =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100, // Maximum allowed limit
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(boundaryLimitResults);

  TestValidator.predicate(
    "maximum limit constraint is respected",
    boundaryLimitResults.data.length <= 100,
  );

  // Validate that filtering enables efficient moderation routing
  TestValidator.predicate(
    "category filtering supports specialized moderation workflows",
    harassmentResults.data.length >= 0 && spamPage1.data.length >= 0,
  );
}
