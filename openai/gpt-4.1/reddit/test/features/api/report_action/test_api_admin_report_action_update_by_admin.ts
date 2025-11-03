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
 * Test that an administrator can successfully update the comment or new_status
 * of an existing moderation action for a report.
 *
 * The test scenario validates the moderation action update mechanism as
 * follows:
 *
 * 1. Admin registers and logs in for authentication context
 * 2. Regular user registers and logs in
 * 3. User creates a community
 * 4. User creates a post in the community
 * 5. User creates a comment on the post
 * 6. User files a report targeting the post
 * 7. Admin logs in and creates a moderation action for the report (action_type =
 *    comment or status_update)
 * 8. Admin updates the moderation action's comment or new_status via the admin
 *    action update endpoint
 * 9. Assert the permitted field(s) were updated (e.g., new comment or changed
 *    status), and all other data remains unchanged
 * 10. Audit trail in the report actions history should reflect the update.
 */
export async function test_api_admin_report_action_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration & login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name();
  const adminJoinOutput = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      href: "https://admin.join.community.test/",
      referrer: "https://admin.ref.community.test/",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminJoinOutput);

  // NOTE: For some platforms you may need to separately verify the email for admin account;
  // for this scenario, we assume the admin account is immediately usable.
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.login.community.test/",
      referrer: "https://admin.ref.community.test/",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 2. User registration & login
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userDisplayName = RandomGenerator.name();
  const userJoinOutput = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      display_name: userDisplayName,
      href: "https://user.join.community.test/",
      referrer: "https://user.ref.community.test/",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userJoinOutput);

  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://user.login.community.test/",
      referrer: "https://user.login.ref.community.test/",
    } satisfies ICommunityPlatformUser.ILogin,
  });

  // 3. User creates a community
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityDescription = RandomGenerator.paragraph({ sentences: 5 });
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communityName,
        description: communityDescription,
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 4. User creates a post in the community
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postBody = RandomGenerator.paragraph({ sentences: 10 });
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

  // 5. User creates a comment on the post
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 6. User files a report targeting the post
  const report = await api.functional.communityPlatform.user.reports.create(
    connection,
    {
      body: {
        report_type: RandomGenerator.pick([
          "spam",
          "abuse",
          "off_topic",
          "harassment",
          "explicit_content",
          "other",
        ] as const),
        target_post_id: post.id,
      } satisfies ICommunityPlatformReports.ICreate,
    },
  );
  typia.assert(report);

  // 7. Admin logs in again for operation context switching (actor session)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.login.community.test/",
      referrer: "https://admin.ref.community.test/",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 8. Admin creates a moderation action for the report
  const actionType = RandomGenerator.pick([
    "status_update",
    "comment",
  ] as const);
  const origComment =
    actionType === "comment"
      ? RandomGenerator.paragraph({ sentences: 2 })
      : undefined;
  const origStatus =
    actionType === "status_update"
      ? RandomGenerator.pick([
          "open",
          "under_review",
          "auto_hidden",
          "resolved",
          "dismissed",
        ] as const)
      : undefined;
  const nextStatus =
    actionType === "status_update"
      ? RandomGenerator.pick(["under_review", "resolved", "dismissed"] as const)
      : undefined;

  const origAction =
    await api.functional.communityPlatform.admin.reports.actions.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: actionType,
          old_status: origStatus,
          new_status: nextStatus,
          comment: origComment,
        } satisfies ICommunityPlatformReportActions.ICreate,
      },
    );
  typia.assert(origAction);
  // 9. Admin updates the moderation action's comment or new_status
  // We choose which field to update depending on action type
  let updateFields: ICommunityPlatformReportActions.IUpdate = {};
  let expectUpdatedFields: Partial<ICommunityPlatformReportActions> = {};
  if (actionType === "comment") {
    updateFields = {
      comment: RandomGenerator.paragraph({ sentences: 1 }),
    };
    expectUpdatedFields = {
      comment: updateFields.comment,
    };
  } else if (actionType === "status_update") {
    updateFields = {
      new_status: RandomGenerator.pick([
        "under_review",
        "resolved",
        "dismissed",
      ] as const),
    };
    expectUpdatedFields = {
      new_status: updateFields.new_status,
    };
  }

  const updatedAction =
    await api.functional.communityPlatform.admin.reports.actions.update(
      connection,
      {
        reportId: report.id,
        actionId: origAction.id,
        body: updateFields,
      },
    );
  typia.assert(updatedAction);

  // 10. Validate update: Only permitted fields changed, others unchanged
  if (typeof expectUpdatedFields.comment !== "undefined")
    TestValidator.equals(
      "updated comment must match input",
      updatedAction.comment,
      expectUpdatedFields.comment,
    );
  if (typeof expectUpdatedFields.new_status !== "undefined")
    TestValidator.equals(
      "updated new_status must match input",
      updatedAction.new_status,
      expectUpdatedFields.new_status,
    );
  // All other fields should remain the same (aside from updated_at if present)
  TestValidator.equals(
    "reportId is unchanged",
    updatedAction.report_id,
    origAction.report_id,
  );
  TestValidator.equals(
    "actor_admin_id is unchanged",
    updatedAction.actor_admin_id,
    origAction.actor_admin_id,
  );
  TestValidator.equals(
    "action_type is unchanged",
    updatedAction.action_type,
    origAction.action_type,
  );
  TestValidator.equals("id is unchanged", updatedAction.id, origAction.id);
}
