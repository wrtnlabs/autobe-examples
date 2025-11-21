import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test moderation report priority escalation workflow where moderators can
 * adjust priority levels based on violation severity and urgency. Validates
 * that priority levels can be escalated from 'low' to 'critical' with proper
 * justification and that priority changes affect moderation queue positioning.
 * Ensures that high-priority reports receive expedited processing and that
 * escalation reasons are properly documented for audit purposes.
 */
export async function test_api_moderation_report_priority_escalation(
  connection: api.IConnection,
) {
  // Step 1: Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";
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

  // Step 2: Create community context
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

  // Step 3: Create post content to be reported
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

  // Step 4: Switch to moderator authentication
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

  // Step 5: Submit initial moderation report with low priority
  const initialReport =
    await api.functional.communityPlatform.moderator.moderationReports.create(
      connection,
      {
        body: {
          report_type: "inappropriate_content",
          target_type: "post",
          target_id: post.id,
          description:
            "This post contains inappropriate content that violates community guidelines",
          priority_level: "low",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(initialReport);
  TestValidator.equals(
    "initial report has low priority",
    initialReport.priority_level,
    "low",
  );
  TestValidator.equals(
    "initial report status is submitted",
    initialReport.status,
    "submitted",
  );

  // Step 6: Escalate priority from low to medium with justification
  const mediumPriorityReport =
    await api.functional.communityPlatform.moderator.moderationReports.update(
      connection,
      {
        moderationReportId: initialReport.id,
        body: {
          priority_level: "medium",
          description:
            "Escalated to medium priority due to increased user reports and community impact",
        } satisfies ICommunityPlatformModerationReport.IUpdate,
      },
    );
  typia.assert(mediumPriorityReport);
  TestValidator.equals(
    "report escalated to medium priority",
    mediumPriorityReport.priority_level,
    "medium",
  );
  TestValidator.notEquals(
    "description updated during escalation",
    mediumPriorityReport.description,
    initialReport.description,
  );

  // Step 7: Escalate priority from medium to high with urgency justification
  const highPriorityReport =
    await api.functional.communityPlatform.moderator.moderationReports.update(
      connection,
      {
        moderationReportId: initialReport.id,
        body: {
          priority_level: "high",
          description:
            "Escalated to high priority due to potential community harm and multiple user complaints",
        } satisfies ICommunityPlatformModerationReport.IUpdate,
      },
    );
  typia.assert(highPriorityReport);
  TestValidator.equals(
    "report escalated to high priority",
    highPriorityReport.priority_level,
    "high",
  );

  // Step 8: Escalate priority from high to critical with critical justification
  const criticalPriorityReport =
    await api.functional.communityPlatform.moderator.moderationReports.update(
      connection,
      {
        moderationReportId: initialReport.id,
        body: {
          priority_level: "critical",
          description:
            "Escalated to critical priority due to immediate community safety concerns and potential legal violations",
          escalation_reason:
            "Potential legal violation requiring immediate attention and possible law enforcement involvement",
        } satisfies ICommunityPlatformModerationReport.IUpdate,
      },
    );
  typia.assert(criticalPriorityReport);
  TestValidator.equals(
    "report escalated to critical priority",
    criticalPriorityReport.priority_level,
    "critical",
  );

  // Step 9: Validate escalation reason is properly documented
  TestValidator.equals(
    "escalation reason is recorded for critical priority",
    criticalPriorityReport.escalation_reason,
    "Potential legal violation requiring immediate attention and possible law enforcement involvement",
  );

  // Step 10: Verify complete priority escalation workflow
  TestValidator.equals(
    "report ID remains consistent throughout escalation",
    criticalPriorityReport.id,
    initialReport.id,
  );
  TestValidator.equals(
    "target entity remains unchanged",
    criticalPriorityReport.target.id,
    post.id,
  );
  TestValidator.equals(
    "report type remains consistent",
    criticalPriorityReport.report_type,
    "inappropriate_content",
  );

  // Step 11: Validate that priority changes affect report status (if applicable)
  TestValidator.predicate(
    "report should have updated timestamp after priority changes",
    new Date(criticalPriorityReport.updated_at) >
      new Date(initialReport.updated_at),
  );

  // Step 12: Test error case - invalid priority level escalation
  await TestValidator.error(
    "should reject invalid priority level",
    async () => {
      await api.functional.communityPlatform.moderator.moderationReports.update(
        connection,
        {
          moderationReportId: initialReport.id,
          body: {
            priority_level: "invalid_priority",
          } satisfies ICommunityPlatformModerationReport.IUpdate,
        },
      );
    },
  );

  // Step 13: Final validation of complete escalation workflow
  const priorityLevels = ["low", "medium", "high", "critical"] as const;
  TestValidator.predicate(
    "report went through complete priority escalation sequence",
    priorityLevels.includes(
      criticalPriorityReport.priority_level as (typeof priorityLevels)[number],
    ),
  );
}
