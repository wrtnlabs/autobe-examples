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
 * Test complete moderation workflow transitions for post reports.
 *
 * Validates that administrators can properly transition report status through
 * the defined workflow: from pending to reviewed, then to either action_taken
 * or dismissed. Ensures status transitions follow specific rules and cannot be
 * reversed arbitrarily. Tests that resolved_at timestamp is automatically
 * populated when status changes to action_taken or dismissed, tracking
 * resolution timing and moderation efficiency.
 */
export async function test_api_post_report_status_workflow_transitions(
  connection: api.IConnection,
) {
  // Step 1: Create member account for post creation
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

  // Step 2: Create test post
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

  // Step 3: Create reporting member account
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporter = await api.functional.auth.member.join(connection, {
    body: {
      email: reporterEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(reporter);

  // Step 4: Create report in pending status
  const report =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          actor_type: "member",
          report_reason: "Inappropriate content",
          report_details: "This post contains inappropriate content",
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(report);
  TestValidator.equals(
    "initial status should be pending",
    report.status,
    "pending",
  );
  TestValidator.equals(
    "resolved_at should be undefined initially",
    report.resolved_at,
    undefined,
  );

  // Step 5: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      display_name: RandomGenerator.name(),
      admin_level: "moderator",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 6: Test status transition: pending → reviewed
  const reviewedReport =
    await api.functional.communityPlatform.admin.posts.reports.update(
      connection,
      {
        postId: post.id,
        reportId: report.id,
        body: {
          status: "reviewed",
        } satisfies ICommunityPlatformPostReport.IUpdate,
      },
    );
  typia.assert(reviewedReport);
  TestValidator.equals(
    "status should be reviewed",
    reviewedReport.status,
    "reviewed",
  );
  TestValidator.equals(
    "resolved_at should still be undefined",
    reviewedReport.resolved_at,
    undefined,
  );
  TestValidator.equals(
    "report details should remain unchanged",
    reviewedReport.report_details,
    report.report_details,
  );

  // Step 7: Test status transition: reviewed → action_taken
  const actionTakenReport =
    await api.functional.communityPlatform.admin.posts.reports.update(
      connection,
      {
        postId: post.id,
        reportId: report.id,
        body: {
          status: "action_taken",
        } satisfies ICommunityPlatformPostReport.IUpdate,
      },
    );
  typia.assert(actionTakenReport);
  TestValidator.equals(
    "status should be action_taken",
    actionTakenReport.status,
    "action_taken",
  );
  TestValidator.notEquals(
    "resolved_at should be set",
    actionTakenReport.resolved_at,
    undefined,
  );
  TestValidator.predicate(
    "resolved_at should be valid date",
    actionTakenReport.resolved_at !== undefined,
  );
  TestValidator.predicate(
    "resolved_at should be valid ISO format",
    actionTakenReport.resolved_at !== undefined &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        actionTakenReport.resolved_at,
      ),
  );

  // Step 8: Test invalid transition: action_taken → reviewed (should fail)
  await TestValidator.error(
    "should reject invalid status transition",
    async () => {
      await api.functional.communityPlatform.admin.posts.reports.update(
        connection,
        {
          postId: post.id,
          reportId: report.id,
          body: {
            status: "reviewed",
          } satisfies ICommunityPlatformPostReport.IUpdate,
        },
      );
    },
  );

  // Step 9: Create another report for dismissed workflow
  const secondReport =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          actor_type: "member",
          report_reason: "Spam content",
          report_details: "This post appears to be spam",
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(secondReport);

  // Step 10: Test status transition: pending → dismissed
  const dismissedReport =
    await api.functional.communityPlatform.admin.posts.reports.update(
      connection,
      {
        postId: post.id,
        reportId: secondReport.id,
        body: {
          status: "dismissed",
        } satisfies ICommunityPlatformPostReport.IUpdate,
      },
    );
  typia.assert(dismissedReport);
  TestValidator.equals(
    "status should be dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.notEquals(
    "resolved_at should be set",
    dismissedReport.resolved_at,
    undefined,
  );
  TestValidator.predicate(
    "resolved_at should be valid date",
    dismissedReport.resolved_at !== undefined,
  );
  TestValidator.predicate(
    "resolved_at should be valid ISO format",
    dismissedReport.resolved_at !== undefined &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dismissedReport.resolved_at),
  );

  // Step 11: Test direct transition: pending → action_taken
  const thirdReport =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          actor_type: "member",
          report_reason: "Direct action test",
          report_details: "Testing direct transition to action_taken",
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(thirdReport);

  const directActionReport =
    await api.functional.communityPlatform.admin.posts.reports.update(
      connection,
      {
        postId: post.id,
        reportId: thirdReport.id,
        body: {
          status: "action_taken",
        } satisfies ICommunityPlatformPostReport.IUpdate,
      },
    );
  typia.assert(directActionReport);
  TestValidator.equals(
    "direct transition status should be action_taken",
    directActionReport.status,
    "action_taken",
  );
  TestValidator.notEquals(
    "direct transition resolved_at should be set",
    directActionReport.resolved_at,
    undefined,
  );

  // Step 12: Validate workflow integrity
  TestValidator.notEquals(
    "action_taken and dismissed reports should have different resolved_at timestamps",
    actionTakenReport.resolved_at,
    dismissedReport.resolved_at,
  );
  TestValidator.equals(
    "report details should remain consistent throughout workflow",
    actionTakenReport.report_details,
    report.report_details,
  );
}
