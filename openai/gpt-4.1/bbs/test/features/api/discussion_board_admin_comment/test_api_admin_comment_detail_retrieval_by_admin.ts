import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate admin's ability to retrieve full details of a specific comment on a
 * discussion board article.
 *
 * The test covers registering an admin, registering a user, user creating an
 * article, user posting a comment, and the admin fetching the comment detail
 * using the admin endpoint. The comment returned is validated for matching
 * content, author, article linkage, is not soft-deleted, and can be accessed by
 * the admin irrespective of authorship.
 */
export async function test_api_admin_comment_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminProfile = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      avatar_url: undefined,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminProfile);

  // 2. Register a new user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userProfile = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      avatar_url: undefined,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userProfile);

  // 3. User creates an article
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        attachments: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 4. User posts a comment on the article
  const commentBody = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          body: commentBody,
        } satisfies IDiscussionBoardArticleComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5. Admin retrieves comment details
  const result =
    await api.functional.discussionBoard.admin.articles.comments.at(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(result);

  // 6. Assertions
  TestValidator.equals("comment id matches", result.id, comment.id);
  TestValidator.equals(
    "article id matches",
    result.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals("comment body matches", result.body, commentBody);
  TestValidator.equals("author matches", result.author.id, userProfile.id);
  TestValidator.equals(
    "deleted_at is null (not soft-deleted)",
    result.deleted_at ?? null,
    null,
  );
}
