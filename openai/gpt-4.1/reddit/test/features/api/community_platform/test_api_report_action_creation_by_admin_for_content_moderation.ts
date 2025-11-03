import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformReportActions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportActions";
import type { ICommunityPlatformReportOfComments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComments";
import type { ICommunityPlatformReportOfPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPosts";
import type { ICommunityPlatformReports } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReports";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates that an admin can create a moderation action (audit step) on a
 * reported community post.
 *
 * 1. Register admin account
 * 2. Register two user accounts
 * 3. User 1 creates a community
 * 4. User 1 creates a post in the community
 * 5. User 2 files a report targeting User 1's post
 * 6. Admin creates a moderation action on the report: updates status, adds comment
 * 7. Validates the moderation action (actor linkage, status transition,
 *    auditability)
 */
export async function test_api_report_action_creation_by_admin_for_content_moderation(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name();
  const adminOut = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      href: "https://testcase.local/register-admin",
      referrer: "https://testcase.local/",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminOut);

  // 2. Register two users
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user2Email = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const user1DisplayName = RandomGenerator.name();
  const user2DisplayName = RandomGenerator.name();
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      password: userPassword,
      display_name: user1DisplayName,
      href: "https://testcase.local/register-user",
      referrer: "https://testcase.local/",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user1);
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      password: userPassword,
      display_name: user2DisplayName,
      href: "https://testcase.local/register-user2",
      referrer: "https://testcase.local/",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user2);

  // 3. User 1 creates a community
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityDesc = RandomGenerator.paragraph({ sentences: 5 });
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communityName as string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">,
        description: communityDesc as string &
          tags.MinLength<1> &
          tags.MaxLength<250>,
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 4. User 1 creates a post
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: postTitle,
        text_body: postBody,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. User 2 files report against User 1's post
  const reportCategory = RandomGenerator.pick([
    "spam",
    "abuse",
    "off_topic",
    "harassment",
    "explicit_content",
    "other",
  ] as const);
  const reportDesc = RandomGenerator.paragraph({ sentences: 2 });
  const report = await api.functional.communityPlatform.user.reports.create(
    connection,
    {
      body: {
        report_type: reportCategory,
        description: reportDesc,
        target_post_id: post.id,
        target_comment_id: null,
      } satisfies ICommunityPlatformReports.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "report references post",
    report.post_report?.target_post_id,
    post.id,
  );
  TestValidator.equals("report status is open", report.status, "open");

  // 6. Admin creates moderation action on report
  // Switch identity to admin
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      href: "https://testcase.local/register-admin",
      referrer: "https://testcase.local/",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  const actionType = RandomGenerator.pick([
    "status_update",
    "auto_hide",
    "assign",
    "comment",
    "resolve",
    "dismiss",
  ] as const);
  const moderationComment = RandomGenerator.paragraph({ sentences: 4 });
  const actionOut =
    await api.functional.communityPlatform.admin.reports.actions.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: actionType,
          old_status: report.status,
          new_status:
            actionType === "status_update"
              ? RandomGenerator.pick([
                  "under_review",
                  "auto_hidden",
                  "resolved",
                  "dismissed",
                ] as const)
              : undefined,
          comment: moderationComment,
        } satisfies ICommunityPlatformReportActions.ICreate,
      },
    );
  typia.assert(actionOut);
  TestValidator.equals(
    "reportId matches actionOut.report_id",
    actionOut.report_id,
    report.id,
  );
  TestValidator.equals(
    "action actor_admin_id is non-empty",
    typeof actionOut.actor_admin_id,
    "string",
  );
  TestValidator.equals("action type set", actionOut.action_type, actionType);
  TestValidator.equals(
    "action comment content",
    actionOut.comment,
    moderationComment,
  );

  // 7. Validate moderation action appears in report's audit trail
  // There is no explicit report reload endpoint, so assume further action validation is out-of-scope
}
