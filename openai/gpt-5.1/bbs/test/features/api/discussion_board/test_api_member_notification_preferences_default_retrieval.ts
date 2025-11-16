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
 * Validate retrieval of default notification preferences for a new member user.
 *
 * Business goals:
 *
 * - A newly joined member user must be able to fetch their notification
 *   preferences even if they have never adjusted the settings.
 * - The system should either create or expose a consistent default preferences
 *   record bound to that member.
 * - Defaults are expected to enable activity and digest notifications while
 *   disabling marketing notifications.
 *
 * Scenario steps:
 *
 * 1. Create and authenticate an admin user via POST /auth/adminUser/join.
 * 2. As the admin, create an article category via POST
 *    /discussionBoard/adminUser/articleCategories.
 * 3. Create and authenticate a member user via POST /auth/memberUser/join.
 * 4. As that member, create an article within the category via POST
 *    /discussionBoard/memberUser/articles.
 * 5. As the same member, create a comment on the article via POST
 *    /discussionBoard/memberUser/articles/{articleId}/comments.
 * 6. As the same member, create an attachment on the article via POST
 *    /discussionBoard/memberUser/articles/{articleId}/attachments.
 * 7. Finally, as the same member, call GET
 *    /discussionBoard/memberUser/notifications/memberUser/preferences.
 * 8. Assert that:
 *
 *    - The response type is IDiscussionBoardMemberuserNotificationPreference.
 *    - Discussion_board_memberuser_id matches the authenticated member's id.
 *    - Activity_notifications_enabled === true.
 *    - Digest_notifications_enabled === true.
 *    - Marketing_notifications_enabled === false.
 *    - Created_at and updated_at are well-formed date-time strings (covered by
 *         typia.assert).
 */
export async function test_api_member_notification_preferences_default_retrieval(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As admin, create an article category.
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1 satisfies number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Register and authenticate a member user.
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/home",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member, create an article in the created category.
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBody },
    );
  typia.assert(article);

  // 5. As same member, create a comment on the article.
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 6. As same member, create an attachment on the article.
  const attachmentBody = {
    file_uri:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(16),
    file_name: "attachment-" + RandomGenerator.alphaNumeric(6) + ".txt",
    content_type: "text/plain",
    file_size: 1024 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    order_in_article: 1 satisfies number & tags.Type<"int32">,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 7. Retrieve notification preferences for the current member.
  const preferences: IDiscussionBoardMemberuserNotificationPreference =
    await api.functional.discussionBoard.memberUser.notifications.memberUser.preferences.at(
      connection,
    );
  typia.assert(preferences);

  // 8. Business validations for default preferences.
  TestValidator.equals(
    "notification preferences are bound to the authenticated member",
    preferences.discussion_board_memberuser_id,
    memberAuthorized.id,
  );

  TestValidator.equals(
    "activity notifications should be enabled by default",
    preferences.activity_notifications_enabled,
    true,
  );

  TestValidator.equals(
    "digest notifications should be enabled by default",
    preferences.digest_notifications_enabled,
    true,
  );

  TestValidator.equals(
    "marketing notifications should be disabled by default",
    preferences.marketing_notifications_enabled,
    false,
  );
}
