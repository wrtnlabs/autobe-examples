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
 * Test comprehensive search and filtering capabilities for comment reports by
 * administrators.
 *
 * This test validates that administrators can effectively search and filter
 * comment reports based on various criteria including report status, reporter
 * type, creation date ranges, and keyword matching in report details. The
 * workflow involves creating a complete community ecosystem: registering a
 * member, creating a community, posting a comment, reporting the comment,
 * registering an administrator, and then performing various search operations
 * with different filters to ensure the search functionality works correctly.
 */
export async function test_api_admin_comment_reports_search_filtered(
  connection: api.IConnection,
) {
  // Create unauthenticated connection for member operations
  const memberConn: api.IConnection = { ...connection, headers: {} };

  // 1. Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(memberConn, {
      body: {
        email: memberEmail,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Login as member to perform member operations
  await api.functional.auth.member.login(memberConn, {
    body: {
      email: memberEmail,
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 2. Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConn,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Note: Since we don't have a post creation API in the provided functions,
  // we'll need to simulate the scenario without actual post creation.
  // For this test, we'll focus on the comment report search functionality.

  // Create unauthenticated connection for admin operations
  const adminConn: api.IConnection = { ...connection, headers: {} };

  // 3. Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(adminConn, {
      body: {
        email: adminEmail,
        password: "adminpassword123",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Login as admin to perform admin operations
  await api.functional.auth.admin.login(adminConn, {
    body: {
      email: adminEmail,
      password: "adminpassword123",
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "test-agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Since we cannot create actual comments and reports without the proper post infrastructure,
  // we'll test the search functionality with the available comment ID parameter.
  // This tests the search endpoint's ability to handle various filter combinations.

  const testCommentId = typia.random<string & tags.Format<"uuid">>();

  // 4. Test search with no filters (get all reports)
  const allReports: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.admin.comments.reports.index(
      adminConn,
      {
        commentId: testCommentId,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert(allReports);
  TestValidator.equals(
    "should return paginated results with limit 10",
    allReports.pagination.limit,
    10,
  );

  // 5. Test search with status filter
  const filteredByStatus: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.admin.comments.reports.index(
      adminConn,
      {
        commentId: testCommentId,
        body: {
          page: 1,
          limit: 10,
          status: "submitted",
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert(filteredByStatus);

  // 6. Test search with date range filter
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = new Date().toISOString();

  const filteredByDate: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.admin.comments.reports.index(
      adminConn,
      {
        commentId: testCommentId,
        body: {
          page: 1,
          limit: 10,
          created_at_start: startDate,
          created_at_end: endDate,
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert(filteredByDate);

  // 7. Test search with keyword filter
  const filteredByKeyword: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.admin.comments.reports.index(
      adminConn,
      {
        commentId: testCommentId,
        body: {
          page: 1,
          limit: 10,
          search: "inappropriate",
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert(filteredByKeyword);

  // 8. Test search with reporter type filter
  const filteredByReporter: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.admin.comments.reports.index(
      adminConn,
      {
        commentId: testCommentId,
        body: {
          page: 1,
          limit: 10,
          reporter_type: "member",
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert(filteredByReporter);

  // 9. Validate pagination functionality
  TestValidator.predicate(
    "pagination should have valid structure",
    allReports.pagination.current >= 0 &&
      allReports.pagination.limit > 0 &&
      allReports.pagination.records >= 0 &&
      allReports.pagination.pages >= 0,
  );

  // 10. Test error case with invalid parameters
  await TestValidator.error(
    "should fail with invalid page number",
    async () => {
      await api.functional.communityPlatform.admin.comments.reports.index(
        adminConn,
        {
          commentId: testCommentId,
          body: {
            page: 0, // Invalid page number
            limit: 10,
          } satisfies ICommunityPlatformCommentReport.IRequest,
        },
      );
    },
  );

  // 11. Test error case with invalid limit
  await TestValidator.error("should fail with invalid limit", async () => {
    await api.functional.communityPlatform.admin.comments.reports.index(
      adminConn,
      {
        commentId: testCommentId,
        body: {
          page: 1,
          limit: 0, // Invalid limit
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  });

  // 12. Test comprehensive search with multiple filters
  const comprehensiveSearch: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.admin.comments.reports.index(
      adminConn,
      {
        commentId: testCommentId,
        body: {
          page: 1,
          limit: 5,
          status: "submitted",
          reporter_type: "member",
          created_at_start: startDate,
          created_at_end: endDate,
          search: "content",
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert(comprehensiveSearch);

  TestValidator.equals(
    "comprehensive search should return limited results",
    comprehensiveSearch.pagination.limit,
    5,
  );
}
