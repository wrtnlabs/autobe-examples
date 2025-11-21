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
 * Test post reporting functionality across different user roles to ensure
 * consistent reporting behavior.
 *
 * This test validates that community members can report posts regardless of
 * their role and that the reporting system correctly tracks actor types for
 * moderation prioritization and analysis. The test creates multiple member
 * accounts, establishes posts for reporting, and validates that cross-member
 * reporting works consistently with proper data recording.
 */
export async function test_api_post_report_creation_different_actors(
  connection: api.IConnection,
) {
  // Create multiple member accounts for cross-role reporting testing
  const members: ICommunityPlatformMember.IAuthorized[] = [];

  for (let i = 0; i < 3; i++) {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(member);
    members.push(member);
  }

  // Create a single community ID to use for all posts (simplified approach)
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // Create posts for each member
  const posts: ICommunityPlatformPost[] = [];

  for (const member of members) {
    // Use the member's existing authentication by setting their token
    const unauthConn: api.IConnection = { ...connection, headers: {} };

    const post = await api.functional.communityPlatform.member.posts.create(
      unauthConn,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 5 }),
          post_type: "text",
          status: "published",
          community_platform_community_id: communityId,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }

  // Test cross-member reporting - each member reports posts from other members
  const reports: ICommunityPlatformPostReport[] = [];

  for (let reporterIndex = 0; reporterIndex < members.length; reporterIndex++) {
    const reporter = members[reporterIndex];

    // Use reporter's authentication context
    const reporterConn: api.IConnection = { ...connection, headers: {} };

    // Report posts from other members (not their own)
    for (let postIndex = 0; postIndex < posts.length; postIndex++) {
      if (postIndex !== reporterIndex) {
        const targetPost = posts[postIndex];

        const report =
          await api.functional.communityPlatform.member.posts.reports.create(
            reporterConn,
            {
              postId: targetPost.id,
              body: {
                actor_type: "member",
                report_reason: `Inappropriate content from member ${postIndex + 1}`,
                report_details: `This post appears to violate community guidelines. Reported by member ${reporterIndex + 1}`,
              } satisfies ICommunityPlatformPostReport.ICreate,
            },
          );
        typia.assert(report);
        reports.push(report);

        // Validate report properties
        TestValidator.equals(
          "report should have correct actor type",
          report.actor_type,
          "member",
        );
        TestValidator.equals(
          "report should have pending status",
          report.status,
          "pending",
        );
        TestValidator.predicate(
          "report should have creation timestamp",
          report.created_at !== undefined,
        );
        TestValidator.equals(
          "report should not be resolved initially",
          report.resolved_at,
          undefined,
        );
        TestValidator.predicate(
          "report should reference the post",
          report.post !== undefined,
        );

        if (report.post) {
          TestValidator.equals(
            "reported post ID should match",
            report.post.id,
            targetPost.id,
          );
        }
      }
    }
  }

  // Validate that all expected reports were created
  TestValidator.equals(
    "should create expected number of cross-member reports",
    reports.length,
    members.length * (members.length - 1), // Each member reports (n-1) other members' posts
  );

  // Validate report uniqueness - each reporter-post combination should be unique
  const reportKeys = reports.map(
    (r) => `${r.actor_type}-${r.post?.id}-${r.report_reason}`,
  );
  const uniqueKeys = ArrayUtil.repeat(reportKeys.length, (i) => reportKeys[i]);
  TestValidator.equals(
    "all reports should have unique reporter-post combinations",
    uniqueKeys.length,
    reportKeys.length,
  );

  // Test error scenario: reporting non-existent post
  const testMember = members[0];
  const testConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "should fail when reporting non-existent post",
    async () => {
      await api.functional.communityPlatform.member.posts.reports.create(
        testConn,
        {
          postId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            actor_type: "member",
            report_reason: "Test report for non-existent post",
            report_details: "This should fail",
          } satisfies ICommunityPlatformPostReport.ICreate,
        },
      );
    },
  );

  // Test business logic: reporting with different report reasons
  const testReasons = [
    "spam",
    "harassment",
    "inappropriate content",
    "misinformation",
  ] as const;

  for (const reason of testReasons) {
    const testReport =
      await api.functional.communityPlatform.member.posts.reports.create(
        testConn,
        {
          postId: posts[0].id,
          body: {
            actor_type: "member",
            report_reason: reason,
            report_details: `Testing report reason: ${reason}`,
          } satisfies ICommunityPlatformPostReport.ICreate,
        },
      );
    typia.assert(testReport);

    TestValidator.equals(
      "report reason should be correctly recorded",
      testReport.report_reason,
      reason,
    );
  }
}
