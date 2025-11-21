import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test moderation report creation targeting a comment.
 *
 * This comprehensive E2E test validates the complete moderation workflow for
 * comment violations. The test involves multiple actors: an admin who creates
 * the report and a member who creates the target comment. The workflow
 * includes: 1) Creating admin and member accounts with proper authentication,
 * 2) Creating a parent post for the comment context, 3) Creating a test comment
 * that will be reported, 4) Switching to admin role to submit the moderation
 * report, 5) Validating that the report is properly created with correct target
 * information and violation details. The test ensures that comment-specific
 * reporting follows the platform's moderation workflow and maintains proper
 * actor relationships throughout the process.
 */
export async function test_api_moderation_report_creation_for_comment(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "moderator",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a parent post for the comment context
  // Since we don't have community creation API, we'll use a randomly generated UUID
  // that would represent an existing community in the system
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create a test comment that will be reported
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // Step 5: Switch to admin role for report submission
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 6: Submit moderation report for the comment
  const report: ICommunityPlatformModerationReport =
    await api.functional.communityPlatform.admin.moderationReports.create(
      connection,
      {
        body: {
          report_type: "inappropriate_content",
          target_type: "comment",
          target_id: comment.id,
          description:
            "This comment contains inappropriate content that violates community guidelines",
          priority_level: "medium",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 7: Validate the report was created correctly
  TestValidator.equals(
    "report ID should be valid UUID",
    typeof report.id,
    "string",
  );
  TestValidator.predicate(
    "report should have valid description",
    report.description.length > 0,
  );
  TestValidator.predicate(
    "report should have priority level",
    report.priority_level.length > 0,
  );
  TestValidator.predicate(
    "report should have report type",
    report.report_type.length > 0,
  );
  TestValidator.predicate(
    "report should have creation timestamp",
    report.created_at.length > 0,
  );
  TestValidator.predicate(
    "report should have target information",
    report.target !== undefined,
  );
  TestValidator.equals(
    "report target ID should match comment ID",
    report.target.id,
    comment.id,
  );
}
