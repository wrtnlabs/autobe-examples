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
 * Test the assignment of different priority levels to comment reports based on
 * violation severity.
 *
 * This test validates that the moderation system properly assigns priority
 * levels to reports based on the severity of the reported violation. It creates
 * a complete workflow from member registration through community creation, post
 * creation, comment creation, and finally submitting reports with different
 * priority levels (low, medium, high, critical).
 *
 * The test ensures that higher priority reports are properly tracked and that
 * the system can distinguish between different levels of violation severity for
 * appropriate moderation queue handling.
 */
export async function test_api_comment_report_priority_level_assignment(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
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

  // Step 2: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create post
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

  // Step 4: Create comment to be reported
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

  // Step 5: Submit reports with different priority levels
  const priorityLevels = ["low", "medium", "high", "critical"] as const;
  const reportTypes = [
    "spam",
    "harassment",
    "hate_speech",
    "inappropriate_content",
  ] as const;

  const reports: ICommunityPlatformModerationReport[] = [];

  for (let i = 0; i < priorityLevels.length; i++) {
    const report =
      await api.functional.communityPlatform.member.comments.reports.create(
        connection,
        {
          commentId: comment.id,
          body: {
            report_type: reportTypes[i],
            target_type: "comment",
            target_id: comment.id,
            description: `Report with ${priorityLevels[i]} priority level for ${reportTypes[i]} violation`,
            priority_level: priorityLevels[i],
          } satisfies ICommunityPlatformModerationReport.ICreate,
        },
      );
    typia.assert(report);
    reports.push(report);

    // Validate that the report was created with the correct priority level
    TestValidator.equals(
      `report ${i + 1} should have ${priorityLevels[i]} priority level`,
      report.priority_level,
      priorityLevels[i],
    );
  }

  // Step 6: Validate that all reports were created successfully
  TestValidator.equals("should create exactly 4 reports", reports.length, 4);

  // Step 7: Validate that each priority level is represented
  const createdPriorities = reports.map((r) => r.priority_level);
  TestValidator.equals(
    "should have all priority levels represented",
    createdPriorities.sort(),
    [...priorityLevels].sort(),
  );

  // Step 8: Validate report properties are correctly set
  for (const report of reports) {
    TestValidator.predicate(
      "report should have valid ID",
      report.id.length > 0,
    );
    TestValidator.predicate(
      "report should have description",
      report.description.length > 0,
    );
    TestValidator.predicate(
      "report should have report type",
      report.report_type.length > 0,
    );
    TestValidator.predicate(
      "report should have status",
      report.status.length > 0,
    );
    TestValidator.predicate(
      "report should have confidence score",
      typeof report.confidence_score === "number",
    );
  }
}
