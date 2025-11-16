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
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate that a member can delete their own comment even after an admin has
 * edited it.
 *
 * Business context:
 *
 * - Comments are authored by member users (or admins) and can be moderated/edited
 *   by admins.
 * - Admin moderation must not transfer ownership or revoke the member author's
 *   right to delete their own comment.
 *
 * Scenario steps:
 *
 * 1. Member joins the discussion board (memberUser join) and obtains a JWT.
 * 2. Admin joins (adminUser join) and obtains a JWT.
 * 3. As admin, create an article category for use when creating the article.
 * 4. Switch to member and create an article in that category.
 * 5. As member, create a comment on the article.
 * 6. Switch to admin and update the member's comment via the admin comment update
 *    API.
 * 7. Switch back to member and delete the comment via the member delete API.
 * 8. Assert that:
 *
 *    - The admin edit preserved the comment id and article linkage.
 *    - The admin edit changed the comment body.
 *    - The member delete call succeeds (no error thrown), proving the member can
 *         still delete their own comment post-moderation.
 */
export async function test_api_member_comment_delete_after_admin_edit(
  connection: api.IConnection,
) {
  // 1. Member joins
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Admin joins
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Admin creates an article category
  const categoryCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 4. Switch to member via login and create an article
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberAfterLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAfterLogin);

  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleCreateBody },
    );
  typia.assert(article);

  // 5. Member creates a comment on the article
  const originalCommentBodyText: string = RandomGenerator.paragraph({
    sentences: 3,
  });

  const commentCreateBody = {
    body: originalCommentBodyText,
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

  // 6. Switch to admin and update the member's comment
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminAfterLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin);

  const updatedBodyText: string = RandomGenerator.paragraph({ sentences: 4 });

  const commentUpdateBody = {
    body: updatedBodyText,
  } satisfies IDiscussionBoardComment.IUpdate;

  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.adminUser.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: commentUpdateBody,
      },
    );
  typia.assert(updatedComment);

  // Validate admin update invariants
  TestValidator.equals(
    "admin update preserves comment id",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "admin update preserves article linkage",
    updatedComment.article.id,
    article.id,
  );
  TestValidator.notEquals(
    "admin edit changes comment body",
    updatedComment.body,
    comment.body,
  );

  // 7. Switch back to member and delete the comment
  const memberLoginForDeleteBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberBeforeDelete: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginForDeleteBody,
    });
  typia.assert(memberBeforeDelete);

  await api.functional.discussionBoard.memberUser.articles.comments.erase(
    connection,
    {
      articleId: article.id,
      commentId: comment.id,
    },
  );

  // 8. Final predicate: reaching here means delete succeeded without error.
  TestValidator.predicate(
    "member can delete own comment even after admin edit",
    true,
  );
}
