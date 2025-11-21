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
 * Test complete post reporting workflow for community members.
 *
 * This test validates the end-to-end process of a community member reporting a
 * post. It follows the business flow: member registration → authentication →
 * post creation → report filing → validation of report attributes and
 * relationships.
 */
export async function test_api_post_report_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

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

  // Step 2: Create a post that will be reported
  // Using a valid UUID for community association as required by the DTO
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

  // Step 3: File a report against the created post
  const report =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          actor_type: "member",
          report_reason: "Inappropriate content",
          report_details:
            "This post contains content that violates community guidelines",
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 4: Validate the report response
  TestValidator.equals(
    "report actor_type should be 'member'",
    report.actor_type,
    "member",
  );
  TestValidator.equals(
    "report reason should match input",
    report.report_reason,
    "Inappropriate content",
  );
  TestValidator.equals(
    "report details should match input",
    report.report_details,
    "This post contains content that violates community guidelines",
  );
  TestValidator.equals(
    "report status should be 'pending'",
    report.status,
    "pending",
  );
  TestValidator.predicate(
    "report should have creation timestamp",
    typeof report.created_at === "string" && report.created_at.length > 0,
  );
  TestValidator.equals(
    "report resolved_at should be undefined initially",
    report.resolved_at,
    undefined,
  );

  // Step 5: Validate post reference in report
  TestValidator.predicate(
    "report should reference the post",
    report.post !== undefined,
  );
  if (report.post) {
    TestValidator.equals(
      "referenced post ID should match created post",
      report.post.id,
      post.id,
    );
    TestValidator.equals(
      "referenced post title should match",
      report.post.title,
      post.title,
    );
  }
}
