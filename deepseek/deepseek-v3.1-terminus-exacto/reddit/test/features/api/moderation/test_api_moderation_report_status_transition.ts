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
 * Test moderation report status transition workflow validating proper status
 * progression from 'submitted' through 'under_review' to final resolution
 * states.
 */
export async function test_api_moderation_report_status_transition(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: RandomGenerator.name(),
        moderator_level: "community",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create community
  const community: ICommunityPlatformCommunity =
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

  // Step 4: Create post as report target
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create initial moderation report
  const report: ICommunityPlatformModerationReport =
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
  typia.assert(report);
  TestValidator.equals(
    "initial report status should be submitted",
    report.status,
    "submitted",
  );

  // Step 6: Update report status to 'under_review'
  const updatedReport: ICommunityPlatformModerationReport =
    await api.functional.communityPlatform.moderator.moderationReports.update(
      connection,
      {
        moderationReportId: report.id,
        body: {
          status: "under_review",
          priority_level: "high",
          confidence_score: 0.8,
        } satisfies ICommunityPlatformModerationReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  TestValidator.equals(
    "report status should be under_review",
    updatedReport.status,
    "under_review",
  );
  TestValidator.equals(
    "report priority should be high",
    updatedReport.priority_level,
    "high",
  );
  TestValidator.equals(
    "confidence score should be 0.8",
    updatedReport.confidence_score,
    0.8,
  );

  // Step 7: Update report status to 'dismissed'
  const resolvedReport: ICommunityPlatformModerationReport =
    await api.functional.communityPlatform.moderator.moderationReports.update(
      connection,
      {
        moderationReportId: report.id,
        body: {
          status: "dismissed",
          escalation_reason: "Content review completed - no violation found",
        } satisfies ICommunityPlatformModerationReport.IUpdate,
      },
    );
  typia.assert(resolvedReport);
  TestValidator.equals(
    "report status should be dismissed",
    resolvedReport.status,
    "dismissed",
  );
  TestValidator.equals(
    "escalation reason should be set",
    resolvedReport.escalation_reason,
    "Content review completed - no violation found",
  );

  // Step 8: Test invalid status transition (should fail)
  await TestValidator.error(
    "should reject invalid status transition from dismissed to under_review",
    async () => {
      await api.functional.communityPlatform.moderator.moderationReports.update(
        connection,
        {
          moderationReportId: report.id,
          body: {
            status: "under_review",
          } satisfies ICommunityPlatformModerationReport.IUpdate,
        },
      );
    },
  );

  // Step 9: Validate final report state
  TestValidator.equals(
    "report ID should remain consistent",
    resolvedReport.id,
    report.id,
  );
  TestValidator.equals(
    "report type should remain unchanged",
    resolvedReport.report_type,
    "inappropriate_content",
  );
}
