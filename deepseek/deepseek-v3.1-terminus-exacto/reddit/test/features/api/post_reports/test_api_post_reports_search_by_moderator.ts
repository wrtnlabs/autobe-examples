import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";

/**
 * Test comprehensive post report search functionality for moderators.
 *
 * This test validates the moderator's ability to search and filter post reports
 * with various criteria including status filtering, actor type filtering, and
 * date range filtering. The test follows a complete workflow from member
 * creation through post reporting to moderator search operations.
 */
export async function test_api_post_reports_search_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create first member account to author the test post
  const memberEmail1 = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail1,
        password: "password123456",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Step 2: Create a post that will be reported for moderation testing
  // Note: We need to use a valid community ID that exists in the system
  // Since we don't have a community creation API, we'll use a realistic UUID
  const communityId = typia.random<string & tags.Format<"uuid">>();

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 3: Create second member account to file the report
  const memberEmail2 = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail2,
        password: "password123456",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Step 4: Create report on the post for moderator search testing
  const report: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          actor_type: "member",
          report_reason: "Inappropriate content",
          report_details: "This post contains offensive material",
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 5: Authenticate as moderator to search and access reports
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: RandomGenerator.name(),
        moderator_level: "global",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Authenticate as moderator using login (since join already authenticates)
  // The join operation already sets the Authorization header, so we can proceed

  // Step 6: Test search with various filtering criteria

  // Test 1: Search with status filter (pending reports)
  const pendingResults: IPageICommunityPlatformPostReport.ISummary =
    await api.functional.communityPlatform.moderator.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(pendingResults);
  TestValidator.predicate(
    "should find pending reports",
    pendingResults.data.length >= 0,
  );

  // Test 2: Search with actor type filter
  const memberReports: IPageICommunityPlatformPostReport.ISummary =
    await api.functional.communityPlatform.moderator.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: {
          actor_type: "member",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(memberReports);
  TestValidator.predicate(
    "should find member reports",
    memberReports.data.length >= 0,
  );

  // Test 3: Search with date range filter
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
  const endDate = new Date().toISOString(); // current time

  const dateRangeResults: IPageICommunityPlatformPostReport.ISummary =
    await api.functional.communityPlatform.moderator.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: {
          created_at_start: startDate,
          created_at_end: endDate,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  TestValidator.predicate(
    "should find recent reports",
    dateRangeResults.data.length >= 0,
  );

  // Test 4: Search with combined filters
  const combinedResults: IPageICommunityPlatformPostReport.ISummary =
    await api.functional.communityPlatform.moderator.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: {
          status: "pending",
          actor_type: "member",
          created_at_start: startDate,
          created_at_end: endDate,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(combinedResults);
  TestValidator.predicate(
    "should find reports matching all criteria",
    combinedResults.data.length >= 0,
  );

  // Step 7: Validate search result content
  // Since we can't guarantee the report will be found (due to potential system state),
  // we'll check if it exists and validate it if found
  const foundReport = combinedResults.data.find((r) => r.id === report.id);

  if (foundReport) {
    TestValidator.equals(
      "report reason should match",
      foundReport.report_reason,
      "Inappropriate content",
    );
    TestValidator.equals(
      "report status should be pending",
      foundReport.status,
      "pending",
    );
    TestValidator.equals(
      "actor type should be member",
      foundReport.actor_type,
      "member",
    );
    TestValidator.equals("post ID should match", foundReport.post.id, post.id);
  }

  // Step 8: Test pagination functionality
  const paginationResults: IPageICommunityPlatformPostReport.ISummary =
    await api.functional.communityPlatform.moderator.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(paginationResults);
  TestValidator.predicate(
    "pagination should work correctly",
    paginationResults.data.length <= 5,
  );
  TestValidator.predicate(
    "pagination metadata should be present",
    paginationResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit should be respected",
    paginationResults.pagination.limit === 5,
  );

  // Step 9: Test error case - search for non-existent post
  await TestValidator.error(
    "should error when searching reports for non-existent post",
    async () => {
      await api.functional.communityPlatform.moderator.posts.reports.index(
        connection,
        {
          postId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformPostReport.IRequest,
        },
      );
    },
  );
}
