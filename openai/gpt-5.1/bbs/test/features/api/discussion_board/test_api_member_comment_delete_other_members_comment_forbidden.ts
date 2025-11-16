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
 * Validate that a member user cannot delete another member's comment on an
 * article.
 *
 * Business flow:
 *
 * 1. Member A joins and becomes authenticated.
 * 2. Member B joins and becomes authenticated.
 * 3. Admin joins and becomes authenticated.
 * 4. Admin creates an article category.
 * 5. Member A logs in and creates an article under that category.
 * 6. Member A creates a comment on the article.
 * 7. Member B logs in and attempts to delete Member A's comment.
 * 8. The delete attempt must fail (authorization error), proving ownership-based
 *    deletion.
 *
 * Note: The original scenario asked to re-list comments to ensure the comment
 * still exists after the failed delete, but no list/get-comments API is
 * available in the provided function set. Therefore this test focuses purely on
 * the unauthorized delete error.
 */
export async function test_api_member_comment_delete_other_members_comment_forbidden(
  connection: api.IConnection,
) {
  // 1. Member A joins
  const memberAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberAPassword: string = RandomGenerator.alphaNumeric(12);

  const memberAJoinBody = {
    email: memberAEmail,
    password: memberAPassword,
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAJoin);

  // 2. Member B joins
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberBPassword: string = RandomGenerator.alphaNumeric(12);

  const memberBJoinBody = {
    email: memberBEmail,
    password: memberBPassword,
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberBJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBJoin);

  // 3. Admin joins
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(2),
    bio: null,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 4. Admin creates an article category
  const categoryBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 5. Member A logs in and creates an article
  const memberALoginBody = {
    email: memberAEmail,
    password: memberAPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberALogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  TestValidator.equals(
    "article category should match created category",
    article.category.id,
    category.id,
  );

  // 6. Member A creates a comment on the article
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
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

  TestValidator.equals(
    "comment should belong to created article",
    comment.article.id,
    article.id,
  );

  // 7. Member B logs in
  const memberBLoginBody = {
    email: memberBEmail,
    password: memberBPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberBLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLogin);

  // 8. Member B attempts to delete Member A's comment - must fail
  await TestValidator.error("other member cannot delete comment", async () => {
    await api.functional.discussionBoard.memberUser.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  });
}
