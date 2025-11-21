import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Validates the complete moderation workflow for post reports, testing that
 * moderators can properly update report status through valid workflow
 * transitions from 'pending' to 'reviewed' and then to either 'action_taken' or
 * 'dismissed'.
 */
export async function test_api_post_report_moderation_status_update(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create member account
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

  // 3. Create a post with a valid community UUID (using random UUID as placeholder)
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

  // 4. Create a report on the post
  const report =
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
  TestValidator.equals(
    "initial report status should be pending",
    report.status,
    "pending",
  );

  // 5. Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 6. Update report status from 'pending' to 'reviewed'
  const reviewedReport =
    await api.functional.communityPlatform.moderator.posts.reports.update(
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
    "report status should be reviewed",
    reviewedReport.status,
    "reviewed",
  );

  // 7. Update report status to 'action_taken' (valid workflow transition)
  const actionTakenReport =
    await api.functional.communityPlatform.moderator.posts.reports.update(
      connection,
      {
        postId: post.id,
        reportId: report.id,
        body: {
          status: "action_taken",
          report_details: "Content removed and user warned",
        } satisfies ICommunityPlatformPostReport.IUpdate,
      },
    );
  typia.assert(actionTakenReport);
  TestValidator.equals(
    "report status should be action_taken",
    actionTakenReport.status,
    "action_taken",
  );
  TestValidator.predicate(
    "resolved_at should be set",
    actionTakenReport.resolved_at !== undefined,
  );

  // 8. Test invalid status transition (should fail)
  await TestValidator.error(
    "should reject invalid status transition from action_taken to reviewed",
    async () => {
      await api.functional.communityPlatform.moderator.posts.reports.update(
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

  // 9. Test alternative workflow transition to 'dismissed'
  // Create another report to test dismissed workflow
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

  // Update second report status directly to 'dismissed'
  const dismissedReport =
    await api.functional.communityPlatform.moderator.posts.reports.update(
      connection,
      {
        postId: post.id,
        reportId: secondReport.id,
        body: {
          status: "dismissed",
          report_details: "Report dismissed as false positive",
        } satisfies ICommunityPlatformPostReport.IUpdate,
      },
    );
  typia.assert(dismissedReport);
  TestValidator.equals(
    "second report status should be dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.predicate(
    "resolved_at should be set",
    dismissedReport.resolved_at !== undefined,
  );

  // 10. Validate that report details are properly updated
  TestValidator.equals(
    "action taken report details should match",
    actionTakenReport.report_details,
    "Content removed and user warned",
  );
  TestValidator.equals(
    "dismissed report details should match",
    dismissedReport.report_details,
    "Report dismissed as false positive",
  );

  // 11. Test that report references the correct post
  TestValidator.equals(
    "report should reference correct post",
    actionTakenReport.post?.id,
    post.id,
  );
  TestValidator.equals(
    "dismissed report should reference correct post",
    dismissedReport.post?.id,
    post.id,
  );
}
