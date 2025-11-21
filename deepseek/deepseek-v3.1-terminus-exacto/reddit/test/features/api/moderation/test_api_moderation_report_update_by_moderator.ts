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
 * Test complete moderation report update workflow where a moderator updates an
 * existing report with new status and priority information. The scenario
 * validates that moderators can modify report details including status
 * transitions, priority level adjustments, and escalation reasons while
 * maintaining proper audit trails and data integrity.
 */
export async function test_api_moderation_report_update_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account for content creation
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

  // Step 2: Create moderator account for report management
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

  // Step 3: Create community as prerequisite for post creation
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

  // Step 4: Create post as target for moderation report
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

  // Step 5: Submit initial moderation report
  const initialReport =
    await api.functional.communityPlatform.moderator.moderationReports.create(
      connection,
      {
        body: {
          report_type: "inappropriate_content",
          target_type: "post",
          target_id: post.id,
          description: RandomGenerator.content({ paragraphs: 1 }),
          priority_level: "medium",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(initialReport);

  // Step 6: Authenticate as moderator for report update
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 7: Update moderation report with new status and priority
  const updatedReport =
    await api.functional.communityPlatform.moderator.moderationReports.update(
      connection,
      {
        moderationReportId: initialReport.id,
        body: {
          status: "under_review",
          priority_level: "high",
          escalation_reason:
            "Requires immediate attention due to policy violation",
        } satisfies ICommunityPlatformModerationReport.IUpdate,
      },
    );
  typia.assert(updatedReport);

  // Step 8: Validate report updates
  await TestValidator.equals(
    "report ID remains unchanged",
    updatedReport.id,
    initialReport.id,
  );
  await TestValidator.equals(
    "status updated to under_review",
    updatedReport.status,
    "under_review",
  );
  await TestValidator.equals(
    "priority level escalated to high",
    updatedReport.priority_level,
    "high",
  );
  await TestValidator.equals(
    "escalation reason documented",
    updatedReport.escalation_reason,
    "Requires immediate attention due to policy violation",
  );

  // Step 9: Test additional status transition to action_taken
  const finalReport =
    await api.functional.communityPlatform.moderator.moderationReports.update(
      connection,
      {
        moderationReportId: initialReport.id,
        body: {
          status: "action_taken",
          confidence_score: 0.95,
        } satisfies ICommunityPlatformModerationReport.IUpdate,
      },
    );
  typia.assert(finalReport);

  // Step 10: Final validation
  await TestValidator.equals(
    "final status is action_taken",
    finalReport.status,
    "action_taken",
  );
  await TestValidator.equals(
    "confidence score updated",
    finalReport.confidence_score,
    0.95,
  );
  await TestValidator.equals(
    "priority level maintained",
    finalReport.priority_level,
    "high",
  );
}
