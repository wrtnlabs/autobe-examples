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
 * Validate that an admin user can update a member-authored comment on an
 * article.
 *
 * Business flow:
 *
 * 1. Admin user joins and obtains an authenticated admin session.
 * 2. Admin creates a discussion-board article category.
 * 3. Member user joins and obtains an authenticated member session.
 * 4. Member creates an article under the created category.
 * 5. Member posts a comment on that article.
 * 6. Admin logs in again (switching actor back to adminUser).
 * 7. Admin updates the member-authored comment via PUT
 *    /discussionBoard/adminUser/articles/{articleId}/comments/{commentId}.
 * 8. The test asserts that:
 *
 *    - Comment id is unchanged.
 *    - Comment remains scoped to the same article.
 *    - Body text is updated to the new value and differs from the original.
 *    - Created_at is preserved, and updated_at moves forward (or at least does not
 *         go backwards).
 */
export async function test_api_admin_comment_update_on_member_comment(
  connection: api.IConnection,
) {
  // 1. Admin joins (registration + initial authenticated session)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
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

  // 2. Admin creates an article category
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Member joins
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, Korea",
    ip: null,
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member creates an article under the category
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBody },
    );
  typia.assert(article);

  // 5. Member creates a comment on the article
  const originalCommentBodyText: string = RandomGenerator.paragraph({
    sentences: 4,
  });
  const commentCreateBody = {
    body: originalCommentBodyText,
  } satisfies IDiscussionBoardComment.ICreate;

  const createdComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentCreateBody,
      },
    );
  typia.assert(createdComment);

  // Basic sanity checks on created comment
  TestValidator.equals(
    "created comment is associated with the correct article",
    createdComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "created comment body equals request body",
    createdComment.body,
    originalCommentBodyText,
  );

  const originalCreatedAt = new Date(createdComment.created_at).getTime();
  const originalUpdatedAt = new Date(createdComment.updated_at).getTime();

  // 6. Switch back to admin via login (ensures current session is admin)
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoggedIn: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 7. Admin updates the member-authored comment
  const updatedBodyText: string = RandomGenerator.paragraph({ sentences: 5 });
  const commentUpdateBody = {
    body: updatedBodyText,
  } satisfies IDiscussionBoardComment.IUpdate;

  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.adminUser.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: createdComment.id,
        body: commentUpdateBody,
      },
    );
  typia.assert(updatedComment);

  // 8. Business validations

  // 8.1 ID immutability
  TestValidator.equals(
    "comment id remains unchanged after admin update",
    updatedComment.id,
    createdComment.id,
  );

  // 8.2 Article scoping remains consistent
  TestValidator.equals(
    "updated comment remains associated with the same article",
    updatedComment.article.id,
    article.id,
  );

  // 8.3 Body updated to new content
  TestValidator.equals(
    "comment body is updated to new text",
    updatedComment.body,
    updatedBodyText,
  );

  // 8.4 Body differs from the original
  TestValidator.notEquals(
    "comment body after update differs from original body",
    updatedComment.body,
    createdComment.body,
  );

  // 8.5 created_at is immutable (not later than original)
  const updatedCreatedAt = new Date(updatedComment.created_at).getTime();
  TestValidator.equals(
    "created_at is preserved on admin comment update",
    updatedCreatedAt,
    originalCreatedAt,
  );

  // 8.6 updated_at is moved forward or at least not earlier
  const updatedUpdatedAt = new Date(updatedComment.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is greater than or equal to original updated_at after update",
    updatedUpdatedAt >= originalUpdatedAt,
  );
}
