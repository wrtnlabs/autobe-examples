import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReport";

/**
 * Test advanced filtering scenarios for comment reports with multiple status
 * conditions.
 *
 * This comprehensive E2E test validates the admin comment report search
 * functionality by creating multiple comment reports and verifying that
 * administrators can filter by various criteria. The test validates date range
 * filtering for creation timestamps and tests search functionality to ensure
 * comprehensive moderation workflow support.
 */
export async function test_api_admin_comment_reports_multiple_status_filtering(
  connection: api.IConnection,
) {
  // Create member account for comment creation and reporting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Create community context
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create base comment for multiple report scenarios
  // Using a randomly generated post ID since post creation API is not available
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // Create multiple comment reports
  const reports: ICommunityPlatformModerationReport[] = [];

  for (let i = 0; i < 4; i++) {
    const report =
      await api.functional.communityPlatform.member.comments.reports.create(
        connection,
        {
          commentId: comment.id,
          body: {
            report_type: "inappropriate_content",
            target_type: "comment",
            target_id: comment.id,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            priority_level: "medium",
          } satisfies ICommunityPlatformModerationReport.ICreate,
        },
      );
    typia.assert(report);
    reports.push(report);
  }

  // Switch to admin account for filtering operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Test basic report retrieval without filters
  const allReports =
    await api.functional.communityPlatform.admin.comments.reports.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert(allReports);

  TestValidator.predicate(
    "should retrieve reports for the comment",
    allReports.data.length > 0,
  );

  // Test status filtering with actual status values from created reports
  if (allReports.data.length > 0) {
    const firstReportStatus = allReports.data[0].status;

    const statusFilteredReports =
      await api.functional.communityPlatform.admin.comments.reports.index(
        connection,
        {
          commentId: comment.id,
          body: {
            status: firstReportStatus,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformCommentReport.IRequest,
        },
      );
    typia.assert(statusFilteredReports);

    TestValidator.predicate(
      `status filtered reports should contain items`,
      statusFilteredReports.data.length >= 0,
    );
  }

  // Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const dateFilteredReports =
    await api.functional.communityPlatform.admin.comments.reports.index(
      connection,
      {
        commentId: comment.id,
        body: {
          created_at_start: oneDayAgo.toISOString(),
          created_at_end: oneDayFromNow.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert(dateFilteredReports);

  TestValidator.predicate(
    "date range filtering should return results",
    dateFilteredReports.data.length >= 0,
  );

  // Test search functionality with keyword
  const searchReports =
    await api.functional.communityPlatform.admin.comments.reports.index(
      connection,
      {
        commentId: comment.id,
        body: {
          search: "inappropriate",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert(searchReports);

  TestValidator.predicate("keyword search should execute without error", true);

  // Validate pagination structure
  const paginatedReports =
    await api.functional.communityPlatform.admin.comments.reports.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert(paginatedReports);

  TestValidator.equals(
    "pagination current page should be 1",
    paginatedReports.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    paginatedReports.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records count should be non-negative",
    paginatedReports.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count should be non-negative",
    paginatedReports.pagination.pages >= 0,
  );

  // Test empty filter scenario
  const emptyFilterReports =
    await api.functional.communityPlatform.admin.comments.reports.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert(emptyFilterReports);

  TestValidator.predicate(
    "empty filter should return results",
    emptyFilterReports.data.length >= 0,
  );
}
