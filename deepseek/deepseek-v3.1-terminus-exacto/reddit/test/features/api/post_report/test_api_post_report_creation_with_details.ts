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
 * Test post reporting with detailed explanations and context information.
 *
 * This E2E test validates the complete workflow of creating a detailed post
 * report, including member authentication, post creation, and comprehensive
 * report filing with both primary violation reason and additional explanatory
 * details. The test ensures that the moderation system receives sufficient
 * context for effective decision-making by validating that all report
 * information is properly stored and returned in the response.
 */
export async function test_api_post_report_creation_with_details(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post that will be reported
  // Note: Using a valid UUID format for community ID as required by schema
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
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: File a detailed report with comprehensive violation information
  const reportReason = "Inappropriate content violating community guidelines";
  const reportDetails =
    "This post contains offensive language and personal attacks against other community members. The content specifically targets individuals based on their background and includes derogatory remarks that violate our community standards.";

  const report =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          actor_type: "member",
          report_reason: reportReason,
          report_details: reportDetails,
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 4: Validate report response contains all submitted information
  TestValidator.equals(
    "report reason matches submitted reason",
    report.report_reason,
    reportReason,
  );
  TestValidator.equals(
    "report details match submitted details",
    report.report_details,
    reportDetails,
  );
  TestValidator.predicate(
    "report status is defined",
    typeof report.status === "string",
  );
  TestValidator.equals(
    "report actor type is member",
    report.actor_type,
    "member",
  );
  TestValidator.predicate(
    "report has creation timestamp",
    report.created_at !== undefined,
  );
  TestValidator.predicate(
    "resolved_at is undefined for pending report",
    report.resolved_at === undefined,
  );

  // Validate post reference in report
  TestValidator.predicate(
    "report contains post reference",
    report.post !== undefined,
  );
  if (report.post) {
    TestValidator.equals(
      "reported post ID matches created post ID",
      report.post.id,
      post.id,
    );
    TestValidator.equals(
      "reported post title matches created post title",
      report.post.title,
      post.title,
    );
  }
}
