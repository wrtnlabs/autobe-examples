import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Test post reporting with different violation reasons to ensure comprehensive
 * coverage of moderation categories.
 *
 * This test validates the post reporting system by creating multiple reports
 * with various violation types: spam, harassment, inappropriate content, and
 * misinformation. Each report is tested to ensure proper categorization and
 * handling by the moderation system.
 */
export async function test_api_post_report_creation_multiple_reasons(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create test post for reporting scenarios
  // Use a realistic community ID format - in a real scenario, this would come from an existing community
  const communityId = typia.random<string & tags.Format<"uuid">>();

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Generate reports with different violation reasons
  const reportReasons = [
    "spam",
    "harassment",
    "inappropriate content",
    "misinformation",
  ] as const;

  const createdReports: ICommunityPlatformPostReport[] = [];

  for (const reason of reportReasons) {
    const report =
      await api.functional.communityPlatform.member.posts.reports.create(
        connection,
        {
          postId: post.id,
          body: {
            actor_type: "member",
            report_reason: reason,
            report_details: `This post violates community guidelines due to ${reason}`,
          } satisfies ICommunityPlatformPostReport.ICreate,
        },
      );
    typia.assert(report);
    createdReports.push(report);

    // Validate each report is properly created
    TestValidator.equals(
      `report ${reason} should have correct reason`,
      report.report_reason,
      reason,
    );
    TestValidator.equals(
      `report ${reason} should have pending status`,
      report.status,
      "pending",
    );
    TestValidator.predicate(
      `report ${reason} should have creation timestamp`,
      report.created_at !== undefined && report.created_at.length > 0,
    );
  }

  // Step 4: Validate all reports were created successfully
  TestValidator.equals(
    "should create all four reports",
    createdReports.length,
    4,
  );

  // Step 5: Ensure each report has unique ID
  const reportIds = createdReports.map((r) => r.id);
  const uniqueIds = new Set(reportIds);
  TestValidator.equals(
    "all report IDs should be unique",
    uniqueIds.size,
    reportIds.length,
  );

  // Step 6: Validate report structure and relationships
  for (const report of createdReports) {
    TestValidator.predicate(
      "report should reference the correct post",
      report.post !== undefined && report.post.id === post.id,
    );
    TestValidator.equals(
      "report actor_type should be member",
      report.actor_type,
      "member",
    );
    TestValidator.predicate(
      "report should have valid creation timestamp",
      new Date(report.created_at).getTime() > 0,
    );
  }

  // Step 7: Test error scenario - reporting non-existent post
  await TestValidator.error(
    "should fail when reporting non-existent post",
    async () => {
      await api.functional.communityPlatform.member.posts.reports.create(
        connection,
        {
          postId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            actor_type: "member",
            report_reason: "spam",
            report_details: "Test report for non-existent post",
          } satisfies ICommunityPlatformPostReport.ICreate,
        },
      );
    },
  );
}
