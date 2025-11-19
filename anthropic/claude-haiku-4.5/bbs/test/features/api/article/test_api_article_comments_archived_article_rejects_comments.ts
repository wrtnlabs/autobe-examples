import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that comments cannot be posted on draft articles.
 *
 * Validates that the API enforces article status restrictions on comment
 * creation. The test creates a contributor account and article in draft status,
 * then verifies that attempting to post a comment fails because the article
 * must be published before accepting comments.
 *
 * Note: The provided API endpoints do not include moderator operations to
 * publish or archive articles. Therefore, this test validates comment rejection
 * on draft articles, which represents the API's status-based access control for
 * comments.
 *
 * Test flow:
 *
 * 1. Authenticate contributor via join endpoint
 * 2. Create an article in draft status
 * 3. Attempt to post a comment on the draft article
 * 4. Verify the request fails with appropriate error
 */
export async function test_api_article_comments_archived_article_rejects_comments(
  connection: api.IConnection,
) {
  // Step 1: Authenticate a contributor
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: "SecurePass123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Create an article in draft status
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article initial status is draft",
    article.status,
    "draft",
  );

  // Step 3: Attempt to post a comment on the draft article
  // The API should reject comment creation on articles that are not published
  // (including draft, archived, rejected, or deleted statuses)
  await TestValidator.error(
    "unpublished article should reject comment creation",
    async () => {
      await api.functional.discussionBoard.contributor.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            content: RandomGenerator.paragraph({
              sentences: 5,
              wordMin: 3,
              wordMax: 8,
            }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );
}
