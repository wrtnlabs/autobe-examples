import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test updating a moderation report's description and violation details.
 *
 * This E2E test validates that administrators can modify existing moderation
 * reports to add additional information, correct violation details, adjust
 * confidence scores, and specify escalation reasons when appropriate. The test
 * follows a complete workflow from content creation through report submission
 * to report modification, ensuring data integrity is maintained throughout the
 * update process.
 */
export async function test_api_moderation_report_description_update(
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

  // Step 2: Create admin account for moderation operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin12345",
      display_name: RandomGenerator.name(),
      admin_level: "moderator",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Switch to member context and create test post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      href: "https://example.com/create-post",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Create a valid community ID for the post (using a realistic UUID format)
  const communityId = typia.random<string & tags.Format<"uuid">>();

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Switch to admin context and create initial moderation report
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin12345",
      href: "https://example.com/moderation",
      referrer: "https://example.com",
      session_id: RandomGenerator.alphaNumeric(16),
      user_agent: "Mozilla/5.0 (Test Agent)",
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  const initialReport =
    await api.functional.communityPlatform.admin.moderationReports.create(
      connection,
      {
        body: {
          report_type: "inappropriate_content",
          target_type: "post",
          target_id: post.id,
          description:
            "Initial report description with basic violation details",
          priority_level: "medium",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(initialReport);

  // Step 5: Update the moderation report with enhanced details
  const updatedReport =
    await api.functional.communityPlatform.admin.moderationReports.update(
      connection,
      {
        moderationReportId: initialReport.id,
        body: {
          report_type: "harassment",
          description:
            "Updated report description with additional evidence and clarification. The content violates community guidelines regarding respectful communication.",
          priority_level: "high",
          confidence_score: 0.85,
          escalation_reason:
            "Content requires senior moderator review due to potential legal implications",
        } satisfies ICommunityPlatformModerationReport.IUpdate,
      },
    );
  typia.assert(updatedReport);

  // Step 6: Validate the update was successful
  TestValidator.equals(
    "report ID remains unchanged",
    updatedReport.id,
    initialReport.id,
  );
  TestValidator.equals(
    "report type was updated",
    updatedReport.report_type,
    "harassment",
  );
  TestValidator.equals(
    "description was updated",
    updatedReport.description,
    "Updated report description with additional evidence and clarification. The content violates community guidelines regarding respectful communication.",
  );
  TestValidator.equals(
    "confidence score was set",
    updatedReport.confidence_score,
    0.85,
  );
  TestValidator.equals(
    "escalation reason was set",
    updatedReport.escalation_reason,
    "Content requires senior moderator review due to potential legal implications",
  );
  TestValidator.predicate(
    "updated timestamp should be later than creation",
    new Date(updatedReport.updated_at) > new Date(initialReport.created_at),
  );

  // Additional validation of the complete report structure
  TestValidator.equals(
    "target entity ID remains correct",
    updatedReport.target.id,
    post.id,
  );
  TestValidator.predicate(
    "report should have valid creation timestamp",
    new Date(updatedReport.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "report should have valid update timestamp",
    new Date(updatedReport.updated_at).getTime() > 0,
  );
}
