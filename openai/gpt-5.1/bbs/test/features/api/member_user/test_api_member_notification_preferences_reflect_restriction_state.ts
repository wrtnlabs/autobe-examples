import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardMemberuserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserNotificationPreference";
import type { IDiscussionBoardMemberuserRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserRestriction";

/**
 * Validate that a restricted member user can still read their own notification
 * preferences.
 *
 * Business context
 *
 * - Discussion_board_memberuser_notification_preferences stores per-member
 *   notification flags.
 * - Discussion_board_memberuser_restrictions controls posting/participation
 *   capabilities but should not block read-only inspection of preferences.
 *
 * Scenario steps
 *
 * 1. Register a member user (join) and capture their id; SDK sets member JWT.
 * 2. Register an admin user (join); SDK switches Authorization to admin.
 * 3. As admin, create an article category for later article creation.
 * 4. Log back in as the member user so subsequent calls run under memberUser.
 * 5. As member, create an article in the created category.
 * 6. As member, add a comment and an attachment to that article.
 *
 *    - This step creates realistic activity but is not strictly required for the
 *         core assertion; it helps ensure restriction logic has context.
 * 7. Log in as admin again and apply a posting restriction to the member via POST
 *    /discussionBoard/adminUser/memberUsers/{memberUserId}/restriction.
 * 8. Finally, log back in as the restricted member and call GET
 *    /discussionBoard/memberUser/notifications/memberUser/preferences.
 * 9. Assert that the preferences are successfully returned and belong to the
 *    restricted member, demonstrating that restriction does not block this
 *    read-only endpoint.
 */
export async function test_api_member_notification_preferences_reflect_restriction_state(
  connection: api.IConnection,
) {
  // 1. Register a member user and capture id (member context)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://discussion-board.example.com/signup",
    referrer: "https://discussion-board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;

  // 2. Register an admin user (admin context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://discussion-board.example.com/admin/signup",
    referrer: "https://discussion-board.example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminId = adminAuthorized.id;
  void adminId; // not used further, but kept for clarity that admin exists

  // 3. As admin, create an article category
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 4. Log back in as the member user (switch Authorization to member)
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://discussion-board.example.com/login",
    referrer: "https://discussion-board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const reauthorizedMember: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(reauthorizedMember);
  TestValidator.equals(
    "reauthorized member id matches joined member",
    reauthorizedMember.id,
    memberId,
  );

  // 5. As member, create an article in the created category
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 6. As member, add a comment on that article
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment belongs to the created article",
    comment.article.id,
    article.id,
  );

  // 7. As member, add an attachment to the article
  const attachmentCreateBody = {
    file_uri:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(12),
    file_name: `attachment_${RandomGenerator.alphaNumeric(6)}.txt`,
    content_type: "text/plain",
    file_size: 1024 as number & tags.Type<"int32"> & tags.Minimum<0>,
    order_in_article: 1 as number & tags.Type<"int32">,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment belongs to the created article",
    attachment.discussion_board_article_id,
    article.id,
  );

  // 8. Log in as admin again (switch Authorization back to admin)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://discussion-board.example.com/admin/login",
    referrer: "https://discussion-board.example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const reauthorizedAdmin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(reauthorizedAdmin);
  TestValidator.equals(
    "reauthorized admin id matches joined admin",
    reauthorizedAdmin.id,
    adminId,
  );

  // 9. As admin, apply a restriction to the member
  const nowIso = new Date().toISOString();
  const restrictionCreateBody = {
    restriction_level: "posting_restriction",
    reason_category: "test_restriction_for_notification_preferences",
    started_at: nowIso,
    ended_at: null,
  } satisfies IDiscussionBoardMemberuserRestriction.ICreate;

  const restriction: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.adminUser.memberUsers.restriction.create(
      connection,
      {
        memberUserId: memberId,
        body: restrictionCreateBody,
      },
    );
  typia.assert(restriction);
  TestValidator.equals(
    "restriction targets the correct member",
    restriction.memberUser.id,
    memberId,
  );

  // 10. Switch back to member context after restriction
  const restrictedMember: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(restrictedMember);
  TestValidator.equals(
    "restricted member id still matches original member",
    restrictedMember.id,
    memberId,
  );

  // 11. As restricted member, fetch notification preferences
  const preferences: IDiscussionBoardMemberuserNotificationPreference =
    await api.functional.discussionBoard.memberUser.notifications.memberUser.preferences.at(
      connection,
    );
  typia.assert(preferences);

  // 12. Business assertions: restriction does not block reading preferences
  TestValidator.equals(
    "preferences belong to the restricted member",
    preferences.discussion_board_memberuser_id,
    memberId,
  );

  // Flags must be booleans — typia.assert already guarantees types, but we
  // add simple business-level predicates for clarity.
  TestValidator.predicate(
    "activity notifications flag is boolean",
    typeof preferences.activity_notifications_enabled === "boolean",
  );
  TestValidator.predicate(
    "digest notifications flag is boolean",
    typeof preferences.digest_notifications_enabled === "boolean",
  );
  TestValidator.predicate(
    "marketing notifications flag is boolean",
    typeof preferences.marketing_notifications_enabled === "boolean",
  );

  // Ensure created_at <= updated_at chronologically as a soft sanity check.
  const createdAtTime = Date.parse(preferences.created_at);
  const updatedAtTime = Date.parse(preferences.updated_at);
  TestValidator.predicate(
    "preferences timestamps are in chronological order",
    !Number.isNaN(createdAtTime) &&
      !Number.isNaN(updatedAtTime) &&
      createdAtTime <= updatedAtTime,
  );
}
