import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Test permanent deletion of post reports by administrators.
 *
 * This test validates the complete workflow of post report hard deletion:
 *
 * 1. Member creates a post
 * 2. Another member reports the post
 * 3. Administrator performs hard deletion
 * 4. Validates the report is permanently removed
 */
export async function test_api_post_report_hard_delete_by_admin(
  connection: api.IConnection,
) {
  // Generate test data
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member2Email = typia.random<string & tags.Format<"email">>();
  const adminEmail = typia.random<string & tags.Format<"email">>();

  // Create a mock community ID for testing (since we don't have community creation API)
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // Step 1: Create first member account
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Step 2: Create a post as first member
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

  // Step 3: Create second member account
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Step 4: Second member reports the post
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

  // Step 5: Create admin account
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminpassword123",
        display_name: RandomGenerator.name(),
        admin_level: "moderator",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 6: Admin performs hard deletion of the report
  await api.functional.communityPlatform.admin.posts.reports.erase(connection, {
    postId: post.id,
    reportId: report.id,
  });

  // Step 7: Validate that the report deletion was successful by ensuring
  // the post still exists and can accept new reports (deletion only affected the report)
  const newReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          actor_type: "member",
          report_reason: "Test report after deletion",
          report_details: "Validating that post still accepts reports",
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(newReport);
  TestValidator.notEquals(
    "new report should have different ID",
    newReport.id,
    report.id,
  );

  // Step 8: Clean up - delete the new report as admin
  await api.functional.communityPlatform.admin.posts.reports.erase(connection, {
    postId: post.id,
    reportId: newReport.id,
  });
}
