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

/**
 * Ensure notification preferences are isolated per member user and bound to the
 * authenticated identity.
 *
 * Business goals:
 *
 * - A member user can retrieve only their own notification preferences via GET
 *   /discussionBoard/memberUser/notifications/memberUser/preferences.
 * - The returned IDiscussionBoardMemberuserNotificationPreference must reference
 *   the authenticated member’s id in discussion_board_memberuser_id.
 * - Different members must see their own preference records, not each other’s,
 *   even when both are active in the same discussion board context.
 *
 * Steps:
 *
 * 1. Register Member A (join) and obtain their authorized session (memberA).
 * 2. As Member A, fetch preferences.at and assert the owner id matches memberA.id.
 * 3. Register Member B (join) and obtain memberB.
 * 4. As Member B, fetch preferences.at and assert the owner id matches memberB.id.
 * 5. Assert Member A and Member B preference owner IDs differ, demonstrating
 *    isolation.
 * 6. (Realism) Join an admin and create a category; then have both members create
 *    articles/comments/attachments under that category to simulate independent
 *    activity contexts.
 * 7. After activity, re-fetch preferences for each member to confirm they still
 *    receive their own preference row bound by discussion_board_memberuser_id.
 */
export async function test_api_member_notification_preferences_isolated_per_member(
  connection: api.IConnection,
) {
  // 1. Register Member A
  const memberAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://frontend.example.com/join",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberA: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. Member A fetches their notification preferences
  const prefA: IDiscussionBoardMemberuserNotificationPreference =
    await api.functional.discussionBoard.memberUser.notifications.memberUser.preferences.at(
      connection,
    );
  typia.assert(prefA);

  TestValidator.equals(
    "member A preference owner should match member A id",
    prefA.discussion_board_memberuser_id,
    memberA.id,
  );

  // 3. Register Member B
  const memberBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://frontend.example.com/join",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberB: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 4. Member B fetches their notification preferences
  const prefB: IDiscussionBoardMemberuserNotificationPreference =
    await api.functional.discussionBoard.memberUser.notifications.memberUser.preferences.at(
      connection,
    );
  typia.assert(prefB);

  TestValidator.equals(
    "member B preference owner should match member B id",
    prefB.discussion_board_memberuser_id,
    memberB.id,
  );

  // 5. Ensure isolation between member A and member B
  TestValidator.notEquals(
    "preference owner ids must differ between members",
    prefA.discussion_board_memberuser_id,
    prefB.discussion_board_memberuser_id,
  );

  // 6. Admin joins and creates a category for realistic activity context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(20),
    display_name: RandomGenerator.name(2),
    bio: null,
    ip: null,
    href: "https://frontend.example.com/admin/join",
    referrer: "https://frontend.example.com/admin",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 7. Switch to Member A via login and create article, comment, attachment
  const memberALoginBody = {
    email: memberA.email,
    password: memberAJoinBody.password,
    ip: null,
    href: "https://frontend.example.com/login",
    referrer: "https://frontend.example.com",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberALogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  const articleABody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const articleA: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleABody },
    );
  typia.assert(articleA);

  const commentABody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const commentA: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: articleA.id,
        body: commentABody,
      },
    );
  typia.assert(commentA);

  const attachmentABody = {
    file_uri: "https://cdn.example.com/files/attachment-a.bin",
    file_name: "attachment-a.bin",
    content_type: "application/octet-stream",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    order_in_article: 1,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachmentA: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: articleA.id,
        body: attachmentABody,
      },
    );
  typia.assert(attachmentA);

  // 8. Switch to Member B via login and create article, comment, attachment
  const memberBLoginBody = {
    email: memberB.email,
    password: memberBJoinBody.password,
    ip: null,
    href: "https://frontend.example.com/login",
    referrer: "https://frontend.example.com",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberBLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLogin);

  const articleBBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const articleB: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBBody },
    );
  typia.assert(articleB);

  const commentBBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const commentB: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: articleB.id,
        body: commentBBody,
      },
    );
  typia.assert(commentB);

  const attachmentBBody = {
    file_uri: "https://cdn.example.com/files/attachment-b.bin",
    file_name: "attachment-b.bin",
    content_type: "application/octet-stream",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    order_in_article: 1,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachmentB: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: articleB.id,
        body: attachmentBBody,
      },
    );
  typia.assert(attachmentB);

  // 9. Re-fetch preferences as Member A after activity
  const memberALoginAgain: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALoginAgain);

  const prefAAfter: IDiscussionBoardMemberuserNotificationPreference =
    await api.functional.discussionBoard.memberUser.notifications.memberUser.preferences.at(
      connection,
    );
  typia.assert(prefAAfter);

  TestValidator.equals(
    "member A preference owner should still match member A id after activity",
    prefAAfter.discussion_board_memberuser_id,
    memberA.id,
  );

  // 10. Re-fetch preferences as Member B after activity
  const memberBLoginAgain: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLoginAgain);

  const prefBAfter: IDiscussionBoardMemberuserNotificationPreference =
    await api.functional.discussionBoard.memberUser.notifications.memberUser.preferences.at(
      connection,
    );
  typia.assert(prefBAfter);

  TestValidator.equals(
    "member B preference owner should still match member B id after activity",
    prefBAfter.discussion_board_memberuser_id,
    memberB.id,
  );

  // Final cross-check that preferences remain isolated
  TestValidator.notEquals(
    "preference owner ids must still differ after activity",
    prefAAfter.discussion_board_memberuser_id,
    prefBAfter.discussion_board_memberuser_id,
  );
}
