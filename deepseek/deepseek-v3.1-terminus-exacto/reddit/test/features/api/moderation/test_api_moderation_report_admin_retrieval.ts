import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test that administrators can retrieve detailed moderation report information
 * after a report has been submitted by a member. Validates that admin-level
 * access provides complete report details including violation type, target
 * entity information, reporter details, and current processing status. The
 * scenario establishes proper authentication context for admin users and
 * ensures comprehensive report data accessibility for administrative
 * oversight.
 */
export async function test_api_moderation_report_admin_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for administrative access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
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

  // Step 2: Create member account to submit the report
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a community as the target entity
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create a post within the community as specific target
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

  // Step 5: Submit moderation report against the created post
  const moderationReport: ICommunityPlatformModerationReport =
    await api.functional.communityPlatform.member.moderationReports.create(
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

  // Step 6: Switch to admin account and retrieve the detailed report information
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 7: Admin retrieves the detailed report information
  const retrievedReport: ICommunityPlatformModerationReport =
    await api.functional.communityPlatform.admin.moderationReports.at(
      connection,
      {
        moderationReportId: moderationReport.id,
      },
    );
  typia.assert(retrievedReport);

  // Step 8: Validate that admin can access complete report details
  TestValidator.equals(
    "retrieved report ID matches created report ID",
    retrievedReport.id,
    moderationReport.id,
  );
  TestValidator.equals(
    "report type matches",
    retrievedReport.report_type,
    "inappropriate_content",
  );
  TestValidator.equals(
    "report status is submitted",
    retrievedReport.status,
    "submitted",
  );
  TestValidator.equals(
    "priority level matches",
    retrievedReport.priority_level,
    "medium",
  );
  TestValidator.predicate(
    "confidence score is a number",
    typeof retrievedReport.confidence_score === "number",
  );
  TestValidator.predicate(
    "target entity has valid information",
    retrievedReport.target !== null && retrievedReport.target !== undefined,
  );
  TestValidator.predicate(
    "target entity has name",
    retrievedReport.target.name.length > 0,
  );
  TestValidator.predicate(
    "target entity has valid status",
    retrievedReport.target.status.length > 0,
  );
  TestValidator.predicate(
    "created at timestamp is valid",
    new Date(retrievedReport.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated at timestamp is valid",
    new Date(retrievedReport.updated_at).getTime() > 0,
  );

  // Additional validation: Test that admin-level access provides complete details
  TestValidator.predicate(
    "report has comprehensive details for admin oversight",
    retrievedReport.description.length > 0 &&
      retrievedReport.report_type.length > 0 &&
      retrievedReport.priority_level.length > 0 &&
      retrievedReport.target.id.length > 0,
  );
}
