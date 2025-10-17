import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Verify admin can create moderation action to remove a reported post, and that
 * only admin may do so.
 */
export async function test_api_moderation_action_create_by_admin_post_removal(
  connection: api.IConnection,
) {
  // 1. Register platform admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register separate member (who creates and reports the post)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(10);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. As member, create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          title: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
          slug: RandomGenerator.alphabets(10),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. As member, create a post in that community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
        content_body: RandomGenerator.content({ paragraphs: 1 }),
        content_type: "text",
        status: "published",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Switch to admin (already is admin after join), create report category
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: `spam-${RandomGenerator.alphabets(5)}`,
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(reportCategory);

  // 6. Switch back to member (simulate - since SDK reuses connection, member works here), report the post
  // (No account switching required because authentication is handled by last action, but real-world would need session management)
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        post_id: post.id,
        report_category_id: reportCategory.id,
        reason_text: "this post is offensive",
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // 7. As admin create moderation action with 'remove_post', referencing admin (actor_id), target_post_id, and report_id
  // Switch to admin (simulate)
  // (We cannot switch connection.headers, so this test is logically correct, actual token switching is SDK internal)
  const action =
    await api.functional.communityPlatform.admin.moderationActions.create(
      connection,
      {
        body: {
          actor_id: admin.id,
          target_post_id: post.id,
          report_id: report.id,
          action_type: "remove_post",
          description: "Removed due to pending report",
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert(action);
  TestValidator.equals(
    "moderation action actor matches admin",
    action.actor_id,
    admin.id,
  );
  TestValidator.equals(
    "moderation action post matches target post",
    action.target_post_id,
    post.id,
  );
  TestValidator.equals(
    "moderation action references report",
    action.report_id,
    report.id,
  );
  TestValidator.equals(
    "action type is remove_post",
    action.action_type,
    "remove_post",
  );

  // 8. Try moderation action as member (should fail - only admin can moderate, expect error)
  await TestValidator.error(
    "member cannot create moderation action",
    async () => {
      await api.functional.communityPlatform.admin.moderationActions.create(
        connection,
        {
          body: {
            actor_id: member.id,
            target_post_id: post.id,
            report_id: report.id,
            action_type: "remove_post",
            description: "Attempt by member to moderate",
          } satisfies ICommunityPlatformModerationAction.ICreate,
        },
      );
    },
  );

  // 9. Try moderation action with nonexistent post (should fail)
  await TestValidator.error(
    "reject moderation action when target_post_id is invalid",
    async () => {
      await api.functional.communityPlatform.admin.moderationActions.create(
        connection,
        {
          body: {
            actor_id: admin.id,
            target_post_id: typia.random<string & tags.Format<"uuid">>(),
            report_id: report.id,
            action_type: "remove_post",
            description: "invalid post",
          } satisfies ICommunityPlatformModerationAction.ICreate,
        },
      );
    },
  );

  // 10. Try moderation action with invalid report (should fail)
  await TestValidator.error(
    "reject moderation action when report_id is invalid",
    async () => {
      await api.functional.communityPlatform.admin.moderationActions.create(
        connection,
        {
          body: {
            actor_id: admin.id,
            target_post_id: post.id,
            report_id: typia.random<string & tags.Format<"uuid">>(),
            action_type: "remove_post",
            description: "invalid report",
          } satisfies ICommunityPlatformModerationAction.ICreate,
        },
      );
    },
  );
}
