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
 * Test that a member can retrieve their own post report details after creating
 * a report. This validates the complete workflow from member registration
 * through post creation, reporting, and report retrieval. The scenario ensures
 * that members can access detailed information about reports they filed,
 * including the violation reason, status, timestamps, and moderation progress.
 */
export async function test_api_post_report_retrieval_by_reporter(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Note: Since we don't have a community creation API in the provided functions,
  // we'll use a realistic approach by assuming a valid community ID exists.
  // In a real scenario, we would create a community first.
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Create a post that will be reported
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

  // Step 3: Create a report on the post for retrieval testing
  const report: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          actor_type: "member",
          report_reason: "Inappropriate content",
          report_details: "This post violates community guidelines",
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 4: Retrieve the report details using the report ID
  const retrievedReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.member.posts.reports.at(connection, {
      postId: post.id,
      reportId: report.id,
    });
  typia.assert(retrievedReport);

  // Step 5: Validate that the retrieved report matches the created report
  TestValidator.equals("report ID should match", retrievedReport.id, report.id);
  TestValidator.equals(
    "actor type should match",
    retrievedReport.actor_type,
    report.actor_type,
  );
  TestValidator.equals(
    "report reason should match",
    retrievedReport.report_reason,
    report.report_reason,
  );
  TestValidator.equals(
    "report details should match",
    retrievedReport.report_details,
    report.report_details,
  );
  TestValidator.equals(
    "status should match",
    retrievedReport.status,
    report.status,
  );

  // Step 6: Verify that the report contains all expected fields including post context
  TestValidator.predicate(
    "report should have post context",
    retrievedReport.post !== undefined,
  );
  if (retrievedReport.post) {
    TestValidator.equals(
      "post ID should match",
      retrievedReport.post.id,
      post.id,
    );
    TestValidator.equals(
      "post title should match",
      retrievedReport.post.title,
      post.title,
    );
  }

  // Additional validation: Check timestamps
  TestValidator.predicate(
    "created_at should be valid date",
    new Date(retrievedReport.created_at).toString() !== "Invalid Date",
  );

  // Validate that the report is in pending status initially
  TestValidator.equals(
    "report should be in pending status",
    retrievedReport.status,
    "pending",
  );
}
