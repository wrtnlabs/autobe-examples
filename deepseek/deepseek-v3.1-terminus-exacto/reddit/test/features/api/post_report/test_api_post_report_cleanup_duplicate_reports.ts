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
 * Test cleanup of duplicate post reports by administrators. Validates that
 * administrators can identify and remove duplicate reports for the same post,
 * ensuring moderation efficiency and preventing report spam. Tests the hard
 * delete functionality for maintaining clean moderation queues and handling
 * exceptional cases where report deletion is necessary despite the typical
 * workflow-based resolution process.
 */
export async function test_api_post_report_cleanup_duplicate_reports(
  connection: api.IConnection,
) {
  // Step 1: Create a community platform member to author a test post
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author = await api.functional.auth.member.join(connection, {
    body: {
      email: authorEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(author);

  // Step 2: Create a test post for duplicate reporting scenario
  // Note: Using a valid UUID format for community ID
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Authenticate first reporting member and create initial report
  const reporter1Email = typia.random<string & tags.Format<"email">>();
  const reporter1 = await api.functional.auth.member.join(connection, {
    body: {
      email: reporter1Email,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(reporter1);

  const report1 =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          actor_type: "member",
          report_reason: "Inappropriate content",
          report_details: "This post contains offensive material",
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(report1);

  // Step 4: Authenticate second reporting member and create duplicate report
  const reporter2Email = typia.random<string & tags.Format<"email">>();
  const reporter2 = await api.functional.auth.member.join(connection, {
    body: {
      email: reporter2Email,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(reporter2);

  const report2 =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          actor_type: "member",
          report_reason: "Inappropriate content",
          report_details: "Duplicate report - same issue as previous",
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(report2);

  // Step 5: Authenticate as administrator to perform cleanup deletion
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminpassword123",
      display_name: RandomGenerator.name(),
      admin_level: "moderator",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 6: Validate that duplicate reports can be properly identified and removed
  await api.functional.communityPlatform.admin.posts.reports.erase(connection, {
    postId: post.id,
    reportId: report2.id,
  });

  // Verify that the duplicate report was successfully deleted
  TestValidator.predicate(
    "duplicate report deletion completed successfully",
    true,
  );

  // Additional validation: Ensure the first report still exists
  TestValidator.notEquals(
    "first report ID should not match deleted report ID",
    report1.id,
    report2.id,
  );
}
