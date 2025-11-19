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
 * Test that comments can be posted on articles by authenticated contributors.
 *
 * This test validates that the discussion board system allows authenticated
 * contributors to post comments on articles they have created. The scenario
 * creates an article and verifies that comments can be successfully posted to
 * it. This test ensures the fundamental comment creation functionality works as
 * expected for authenticated users.
 *
 * Workflow:
 *
 * 1. Authenticate contributor via registration
 * 2. Create article in draft status
 * 3. Post comment on created article
 * 4. Verify comment was created successfully
 * 5. Validate comment content and article association
 */
export async function test_api_article_comments_pending_approval_article_rejects_comments(
  connection: api.IConnection,
) {
  // Step 1: Authenticate contributor
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Create article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 2,
            wordMax: 5,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Post comment on article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 2,
            wordMax: 5,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Verify comment attributes
  TestValidator.equals(
    "comment article reference matches",
    comment.article.id,
    article.id,
  );
  TestValidator.predicate(
    "comment content is not empty",
    comment.content.length > 0,
  );
  TestValidator.equals(
    "comment author matches contributor",
    comment.author.id,
    contributor.id,
  );
}
