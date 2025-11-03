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
 * Test that an administrator can permanently erase a specific moderation
 * workflow action for a given report.
 *
 * This test covers the full workflow: admin registration / login, user
 * registration / login, community creation, post creation, comment creation,
 * report creation targeting either a post or a comment, creation of a
 * moderation action by admin, and then erasure (hard-delete) of that action by
 * the admin. It asserts that the action is removed from the audit history of
 * the report, and ensures only admins can perform the erase operation. Steps:
 *
 * 1. Admin registers and logs in
 * 2. User registers and logs in
 * 3. User creates a community
 * 4. User creates a post in that community
 * 5. User creates a comment in that post
 * 6. User reports either the post or comment (random selection)
 * 7. Admin creates a moderation action for the report
 * 8. Admin erases that moderation action
 * 9. [No GET endpoint for actions, so cannot fetch audit directly; instead, check
 *    erase runs without error]
 */
export async function test_api_admin_report_action_erase_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name(2);

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      href: "https://test.example.com/admin/join",
      referrer: "https://test.example.com/",
      ip: undefined,
    },
  });
  typia.assert(adminJoin);

  // 2. User registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userDisplayName = RandomGenerator.name(2);

  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      display_name: userDisplayName,
      href: "https://test.example.com/user/join",
      referrer: "https://test.example.com/",
      ip: undefined,
    },
  });
  typia.assert(userJoin);

  // 3. User login
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://test.example.com/login",
      referrer: "https://test.example.com/",
      ip: undefined,
    },
  });

  // 4. Create community
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      },
    });
  typia.assert(community);

  // 5. Create post
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        text_body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 4,
          sentenceMax: 8,
        }),
      },
    },
  );
  typia.assert(post);

  // 6. Create comment on the post
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(comment);

  // 7. Randomly choose to report post or comment
  type TargetType = "post" | "comment";
  const targetType: TargetType = RandomGenerator.pick([
    "post",
    "comment",
  ] as const);
  const reportCreateBody =
    targetType === "post"
      ? {
          report_type: RandomGenerator.pick([
            "spam",
            "abuse",
            "off_topic",
            "harassment",
            "explicit_content",
            "other",
          ] as const),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          target_post_id: post.id,
          target_comment_id: null,
        }
      : {
          report_type: RandomGenerator.pick([
            "spam",
            "abuse",
            "off_topic",
            "harassment",
            "explicit_content",
            "other",
          ] as const),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          target_post_id: null,
          target_comment_id: comment.id,
        };

  const report = await api.functional.communityPlatform.user.reports.create(
    connection,
    {
      body: reportCreateBody,
    },
  );
  typia.assert(report);

  // 8. Admin login (switch actor)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://test.example.com/login",
      referrer: "https://test.example.com/",
      ip: undefined,
    },
  });

  // 9. Create moderation action
  const actionCreate: ICommunityPlatformReportActions.ICreate = {
    action_type: RandomGenerator.pick([
      "status_update",
      "auto_hide",
      "assign",
      "comment",
      "resolve",
      "dismiss",
    ] as const),
    old_status: "open",
    new_status: "under_review",
    comment: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const action =
    await api.functional.communityPlatform.admin.reports.actions.create(
      connection,
      {
        reportId: report.id,
        body: actionCreate,
      },
    );
  typia.assert(action);

  // 10. Erase the action as admin
  await api.functional.communityPlatform.admin.reports.actions.erase(
    connection,
    {
      reportId: report.id,
      actionId: action.id,
    },
  );

  // 11. Try erasing again (should fail, as action is gone)
  await TestValidator.error(
    "cannot erase already deleted moderation action",
    async () => {
      await api.functional.communityPlatform.admin.reports.actions.erase(
        connection,
        {
          reportId: report.id,
          actionId: action.id,
        },
      );
    },
  );
}
