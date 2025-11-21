import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test reporting a comment with different violation types to ensure the
 * moderation system handles various categories appropriately.
 *
 * This test validates the moderation workflow by creating a member account,
 * community, post, and comment setup, then submitting reports for spam,
 * harassment, hate speech, and inappropriate content violations. The test
 * ensures each report type is properly recorded with appropriate priority
 * levels and that the system distinguishes between different violation
 * categories in the moderation workflow.
 */
export async function test_api_comment_report_multiple_violation_types(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      ip: "192.168.1.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create community to host content for testing
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(15),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create post within the community for comment context
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create comment that will be reported for moderation
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 5. Submit multiple reports with different violation types
  const violationTypes = [
    "spam",
    "harassment",
    "hate_speech",
    "inappropriate_content",
  ] as const;
  const priorityLevels = ["low", "medium", "high", "critical"] as const;

  const reports: ICommunityPlatformModerationReport[] = [];

  for (let i = 0; i < violationTypes.length; i++) {
    const reportType = violationTypes[i];
    const priorityLevel = priorityLevels[i];

    const report =
      await api.functional.communityPlatform.member.comments.reports.create(
        connection,
        {
          commentId: comment.id,
          body: {
            report_type: reportType,
            target_type: "comment",
            target_id: comment.id,
            description: `This comment violates ${reportType} policies`,
            priority_level: priorityLevel,
          } satisfies ICommunityPlatformModerationReport.ICreate,
        },
      );
    typia.assert(report);
    reports.push(report);

    // Validate report properties
    TestValidator.equals(
      `report ${reportType} type matches`,
      report.report_type,
      reportType,
    );
    TestValidator.equals(
      `report ${reportType} priority level matches`,
      report.priority_level,
      priorityLevel,
    );
    TestValidator.predicate(
      `report ${reportType} has valid status`,
      report.status === "submitted",
    );
    TestValidator.predicate(
      `report ${reportType} has confidence score`,
      typeof report.confidence_score === "number",
    );
  }

  // 6. Validate that all reports are distinct and properly recorded
  TestValidator.equals(
    "all reports created successfully",
    reports.length,
    violationTypes.length,
  );

  // Check that each report has unique ID
  const reportIds = reports.map((r) => r.id);
  const uniqueIds = new Set(reportIds);
  TestValidator.equals(
    "all report IDs are unique",
    uniqueIds.size,
    reports.length,
  );

  // Validate that reports have different violation types
  const reportedTypes = reports.map((r) => r.report_type);
  const uniqueTypes = new Set(reportedTypes);
  TestValidator.equals(
    "all violation types are distinct",
    uniqueTypes.size,
    violationTypes.length,
  );

  // Validate priority level assignment logic
  const highPriorityReports = reports.filter(
    (r) => r.priority_level === "high" || r.priority_level === "critical",
  );
  TestValidator.predicate(
    "serious violations have higher priority",
    highPriorityReports.length >= 2,
  );
}
