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
 * Test the creation of a moderation report targeting a post in a community
 * platform. This comprehensive E2E test validates the complete moderation
 * reporting workflow, including user authentication, post creation, and report
 * submission with proper relationship mapping between the report and target
 * post.
 */
export async function test_api_moderation_report_creation_for_post(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create and authenticate member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        ip: undefined,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Switch to member context and create a post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: undefined,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Create a valid community ID for the post - using a realistic UUID format
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

  // Step 4: Switch back to admin context and submit moderation report
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: undefined,
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin",
      session_id: typia.random<string>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  const moderationReport: ICommunityPlatformModerationReport =
    await api.functional.communityPlatform.admin.moderationReports.create(
      connection,
      {
        body: {
          report_type: "inappropriate_content",
          target_type: "post",
          target_id: post.id,
          description: RandomGenerator.content({ paragraphs: 2 }),
          priority_level: "medium",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(moderationReport);

  // Step 5: Validate the moderation report was created correctly
  TestValidator.equals(
    "moderation report target ID matches post ID",
    moderationReport.target.id,
    post.id,
  );

  TestValidator.equals(
    "moderation report target name matches post title",
    moderationReport.target.name,
    post.title,
  );

  TestValidator.predicate(
    "moderation report has valid status",
    moderationReport.status === "submitted" ||
      moderationReport.status === "under_review",
  );

  TestValidator.predicate(
    "moderation report has valid priority level",
    ["low", "medium", "high", "critical"].includes(
      moderationReport.priority_level,
    ),
  );

  TestValidator.predicate(
    "moderation report has confidence score",
    moderationReport.confidence_score >= 0 &&
      moderationReport.confidence_score <= 1,
  );
}
