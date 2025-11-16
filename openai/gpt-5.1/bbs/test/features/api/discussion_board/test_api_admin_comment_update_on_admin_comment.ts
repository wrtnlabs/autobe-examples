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
 * Validate that an admin user can update their own admin-authored comment on an
 * article.
 *
 * Business context:
 *
 * - Articles are created by authenticated member users under specific categories.
 * - Admin users can author comments on those articles through admin-scoped
 *   endpoints.
 * - Admin users must be able to update the body of their own comments without
 *   changing identity, article linkage, or moderation status.
 *
 * Scenario steps:
 *
 * 1. Register a memberUser and implicitly authenticate them via
 *    /auth/memberUser/join.
 * 2. Register an adminUser and implicitly authenticate them via
 *    /auth/adminUser/join.
 * 3. As the adminUser, create an article category via
 *    /discussionBoard/adminUser/articleCategories.
 * 4. Switch authentication to the memberUser and create an article under that
 *    category via /discussionBoard/memberUser/articles.
 * 5. Switch authentication back to the adminUser and create a comment on that
 *    article via /discussionBoard/adminUser/articles/{articleId}/comments.
 * 6. Update the admin-authored comment using PUT
 *    /discussionBoard/adminUser/articles/{articleId}/comments/{commentId} and
 *    change only the comment body.
 * 7. Assert that the update succeeded and core invariants hold:
 *
 *    - Comment id is unchanged.
 *    - Comment article.id matches the original article id.
 *    - Author_type is unchanged and still represents an admin author.
 *    - Status is unchanged.
 *    - Deleted_at remains unchanged (and usually null).
 *    - Body has actually changed and matches the update payload.
 *    - Updated_at is greater than or equal to both original created_at and original
 *         updated_at.
 */
export async function test_api_admin_comment_update_on_admin_comment(
  connection: api.IConnection,
) {
  // 1. Register a member user (join also authenticates as that member).
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(16);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(1),
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register an admin user (join also authenticates as that admin).
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(20) as string & tags.Format<"password">;

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(1),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As the adminUser, create an article category.
  const categoryBody = {
    code: `CAT-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 4. Switch to memberUser and create an article under that category.
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/articles/new",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

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

  // 5. Switch back to adminUser and create an admin-authored comment.
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/comments/new",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const createCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const originalComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.adminUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: createCommentBody,
      },
    );
  typia.assert(originalComment);

  // Sanity checks on initial comment.
  TestValidator.equals(
    "created comment is linked to the correct article",
    originalComment.article.id,
    article.id,
  );

  const originalCreatedAt = new Date(originalComment.created_at);
  const originalUpdatedAt = new Date(originalComment.updated_at);

  // 6. Update the admin-authored comment body via admin endpoint.
  const updatedBodyText = RandomGenerator.paragraph({ sentences: 5 });

  const updateCommentBody = {
    body: updatedBodyText,
  } satisfies IDiscussionBoardComment.IUpdate;

  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.adminUser.articles.comments.update(
      connection,
      {
        articleId: originalComment.article.id,
        commentId: originalComment.id,
        body: updateCommentBody,
      },
    );
  typia.assert(updatedComment);

  // 7. Assert invariants after update.

  // Identity invariants.
  TestValidator.equals(
    "comment id must remain unchanged after update",
    updatedComment.id,
    originalComment.id,
  );
  TestValidator.equals(
    "article id in comment.article must remain unchanged",
    updatedComment.article.id,
    originalComment.article.id,
  );
  TestValidator.equals(
    "updated comment remains linked to the original article",
    updatedComment.article.id,
    article.id,
  );

  // Author type and status invariants.
  TestValidator.equals(
    "author_type should remain unchanged for admin-authored comment",
    updatedComment.author_type,
    originalComment.author_type,
  );
  TestValidator.equals(
    "comment status should not change after body update",
    updatedComment.status,
    originalComment.status,
  );

  // Deleted_at invariant.
  TestValidator.equals(
    "deleted_at should remain unchanged (typically null) after update",
    updatedComment.deleted_at,
    originalComment.deleted_at,
  );

  // Body must change and match payload.
  TestValidator.notEquals(
    "comment body must actually change after update",
    updatedComment.body,
    originalComment.body,
  );
  TestValidator.equals(
    "updated body must reflect the update payload",
    updatedComment.body,
    updatedBodyText,
  );

  // Temporal invariants.
  const updatedUpdatedAt = new Date(updatedComment.updated_at);

  TestValidator.predicate(
    "updated_at should be no earlier than created_at after update",
    updatedUpdatedAt.getTime() >= originalCreatedAt.getTime(),
  );
  TestValidator.predicate(
    "updated_at should be no earlier than original updated_at after update",
    updatedUpdatedAt.getTime() >= originalUpdatedAt.getTime(),
  );
}
