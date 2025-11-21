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
 * Test comprehensive post report update workflow by administrators.
 *
 * Validates that administrators can modify report information, update status
 * through proper workflow transitions (pending → reviewed →
 * action_taken/dismissed), and add resolution details while maintaining audit
 * integrity.
 */
export async function test_api_post_report_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create first member account for post creation
  const member1Email = typia.random<string & tags.Format<"email">>();
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

  // Step 2: Create a post that will be reported
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 3: Create second member account for reporting
  const member2Email = typia.random<string & tags.Format<"email">>();
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

  // Step 4: Create initial post report for administrator to update
  const initialReport: ICommunityPlatformPostReport =
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
  typia.assert(initialReport);

  // Step 5: Create administrator account for report updates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminPassword123",
        display_name: RandomGenerator.name(),
        admin_level: "moderator",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 6: Administrator updates report status and details
  const updatedReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.admin.posts.reports.update(
      connection,
      {
        postId: post.id,
        reportId: initialReport.id,
        body: {
          status: "reviewed",
          report_details:
            "Reviewed and found to be within community guidelines",
        } satisfies ICommunityPlatformPostReport.IUpdate,
      },
    );
  typia.assert(updatedReport);

  // Step 7: Validate report was properly updated
  TestValidator.equals(
    "report status should be updated",
    updatedReport.status,
    "reviewed",
  );
  TestValidator.equals(
    "report details should be updated",
    updatedReport.report_details,
    "Reviewed and found to be within community guidelines",
  );
  TestValidator.equals(
    "report ID should remain unchanged",
    updatedReport.id,
    initialReport.id,
  );
  TestValidator.equals(
    "actor type should remain unchanged",
    updatedReport.actor_type,
    initialReport.actor_type,
  );

  // Step 8: Test additional status transitions
  const finalReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.admin.posts.reports.update(
      connection,
      {
        postId: post.id,
        reportId: initialReport.id,
        body: {
          status: "action_taken",
          report_reason: "Content violation confirmed",
          resolved_at: new Date().toISOString(),
        } satisfies ICommunityPlatformPostReport.IUpdate,
      },
    );
  typia.assert(finalReport);

  TestValidator.equals(
    "final report status should be action_taken",
    finalReport.status,
    "action_taken",
  );
  TestValidator.equals(
    "report reason should be updated",
    finalReport.report_reason,
    "Content violation confirmed",
  );
  TestValidator.predicate(
    "resolved_at should be set",
    finalReport.resolved_at !== undefined,
  );
}
