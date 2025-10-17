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

export async function test_api_moderation_action_update_admin_correction_and_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Admin registration (gains authentication context)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminpass123!",
        superuser: true,
      },
    });
  typia.assert(admin);

  // Step 2: Create test community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2).replace(/\s+/g, "_"),
          title: RandomGenerator.paragraph({ sentences: 4 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          slug: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(community);

  // Step 3: Create a post in the test community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_body: RandomGenerator.content({ paragraphs: 2 }),
        content_type: "text",
        status: "published",
      },
    });
  typia.assert(post);

  // Step 4: Admin creates a valid report category
  const reportCategory: ICommunityPlatformReportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          allow_free_text: true,
        },
      },
    );
  typia.assert(reportCategory);

  // Step 5: Member (admin context for simplicity) files a report on the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        post_id: post.id,
        report_category_id: reportCategory.id,
        reason_text: RandomGenerator.paragraph({ sentences: 3 }),
      },
    });
  typia.assert(report);

  // Step 6: Create a moderation action by admin
  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.admin.moderationActions.create(
      connection,
      {
        body: {
          actor_id: admin.id,
          target_post_id: post.id,
          report_id: report.id,
          action_type: "remove_post",
          description: "Initial removal due to report.",
        },
      },
    );
  typia.assert(moderationAction);

  // Capture values for audit comparison
  const originalDescription = moderationAction.description;
  const originalActionType = moderationAction.action_type;
  const originalUpdatedAt = moderationAction.created_at;

  // Step 7: Update moderation action (admin edits description)
  const updateBody = {
    actor_id: admin.id,
    description: "Post-appeal outcome clarified & reason updated by admin.",
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  const updated: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.admin.moderationActions.update(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // Assert: description and audit change
  TestValidator.notEquals(
    "description changed after admin correction",
    updated.description,
    originalDescription,
  );
  TestValidator.equals(
    "action_type unchanged after description update",
    updated.action_type,
    originalActionType,
  );
  TestValidator.equals(
    "updated_by actor_id matches updating admin",
    updated.actor_id,
    admin.id,
  );

  // Step 8: Unauthorized update attempt (simulate with missing actor_id and different connection headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized update attempt forbidden",
    async () => {
      await api.functional.communityPlatform.admin.moderationActions.update(
        unauthConn,
        {
          moderationActionId: moderationAction.id,
          body: {
            description: "Malicious update attempt (should fail)",
          },
        },
      );
    },
  );
}
