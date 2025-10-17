import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Validates that a moderation action can be permanently deleted by an admin,
 * that audit compliance is ensured (no further access to the action is
 * possible), only admins can delete, and all errors for unauthorized or invalid
 * operations are handled correctly.
 *
 * 1. Register and authenticate an admin
 * 2. Create a test community as member (simulate by re-auth or using the
 *    environment)
 * 3. Create a post as member
 * 4. Create a report category as admin
 * 5. File a report as member against the post
 * 6. Create a moderation action as admin for the reported post
 * 7. Delete moderation action as admin (should succeed)
 * 8. Attempt to access/delete again (should get error)
 * 9. Try to delete as a non-admin (should fail)
 * 10. Try to delete a random non-existent moderation action (should fail)
 */
export async function test_api_moderation_action_admin_permanent_delete_audit_compliance(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Abc1234!@#",
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create community as member (simulate member flow)
  const communityInput = {
    name: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityInput },
    );
  typia.assert(community);

  // 3. Create a post in that community
  const postInput = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_body: RandomGenerator.content({ paragraphs: 1 }),
    content_type: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postInput,
    });
  typia.assert(post);

  // 4. Admin creates a report category
  const reportCategoryInput = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    allow_free_text: true,
  } satisfies ICommunityPlatformReportCategory.ICreate;
  const reportCategory: ICommunityPlatformReportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      { body: reportCategoryInput },
    );
  typia.assert(reportCategory);

  // 5. File a report against the post (member context; skip auth switching for E2E simplicity)
  const reportInput = {
    post_id: post.id,
    report_category_id: reportCategory.id,
    reason_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: reportInput,
    });
  typia.assert(report);

  // 6. Create a moderation action as admin
  const moderationActionInput = {
    actor_id: admin.id,
    target_post_id: post.id,
    report_id: report.id,
    action_type: "remove_post",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;
  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.admin.moderationActions.create(
      connection,
      { body: moderationActionInput },
    );
  typia.assert(moderationAction);

  // 7. Delete moderation action as admin (should succeed)
  await api.functional.communityPlatform.admin.moderationActions.erase(
    connection,
    {
      moderationActionId: moderationAction.id,
    },
  );
  // 8. Attempt to delete again (should fail)
  await TestValidator.error(
    "Deleting already-deleted moderation action should fail",
    async () => {
      await api.functional.communityPlatform.admin.moderationActions.erase(
        connection,
        {
          moderationActionId: moderationAction.id,
        },
      );
    },
  );
  // 9. Try to delete as a non-admin (simulate by clearing auth - removing Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Deleting moderation action as non-admin should fail",
    async () => {
      await api.functional.communityPlatform.admin.moderationActions.erase(
        unauthConn,
        {
          moderationActionId: moderationAction.id,
        },
      );
    },
  );
  // 10. Try to delete a random non-existent moderation action (should fail)
  const randomId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "Deleting nonexistent moderation action should fail",
    async () => {
      await api.functional.communityPlatform.admin.moderationActions.erase(
        connection,
        {
          moderationActionId: randomId,
        },
      );
    },
  );
}
