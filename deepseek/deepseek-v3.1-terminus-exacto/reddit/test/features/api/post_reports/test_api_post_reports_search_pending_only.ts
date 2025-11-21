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
 * Test filtering post reports by pending status specifically for moderation
 * queue management.
 *
 * This test validates that the moderator API correctly filters reports to show
 * only those with 'pending' status, which is essential for efficient moderation
 * workflow prioritization.
 */
export async function test_api_post_reports_search_pending_only(
  connection: api.IConnection,
) {
  // Create member account for post creation
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

  // Create a test post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Create multiple reports (all will have 'pending' status by default)
  const reportCount = 5;
  const reports: ICommunityPlatformPostReport[] = [];

  for (let i = 0; i < reportCount; i++) {
    const report =
      await api.functional.communityPlatform.member.posts.reports.create(
        connection,
        {
          postId: post.id,
          body: {
            actor_type: "member",
            report_reason: `Test report ${i + 1}`,
            report_details: `Details for report ${i + 1}`,
          } satisfies ICommunityPlatformPostReport.ICreate,
        },
      );
    typia.assert(report);
    reports.push(report);
  }

  // Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Search specifically for pending reports only
  const pendingReports =
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
  typia.assert(pendingReports);

  // Validate that all returned reports have pending status
  TestValidator.equals(
    "all returned reports should have pending status",
    pendingReports.data.every((report) => report.status === "pending"),
    true,
  );

  // Verify that the number of pending reports matches what we created
  TestValidator.equals(
    "should return all created reports since they are all pending",
    pendingReports.data.length,
    reportCount,
  );

  // Test pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    pendingReports.pagination.current === 1 &&
      pendingReports.pagination.limit === 10 &&
      pendingReports.pagination.pages === 1 &&
      pendingReports.pagination.records === reportCount,
  );

  // Test that reports are properly associated with the post
  TestValidator.equals(
    "all reports should be associated with the correct post",
    pendingReports.data.every((report) => report.post.id === post.id),
    true,
  );

  // Test search without status filter (should return all reports)
  const allReports =
    await api.functional.communityPlatform.moderator.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(allReports);

  // Verify that unfiltered search returns the same number of reports
  TestValidator.equals(
    "unfiltered search should return same number of reports as pending filter",
    allReports.data.length,
    pendingReports.data.length,
  );
}
