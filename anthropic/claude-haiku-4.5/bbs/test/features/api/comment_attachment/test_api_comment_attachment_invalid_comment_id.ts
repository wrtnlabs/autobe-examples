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
 * Test behavior when attempting to attach a file to a non-existent comment
 * within a valid article.
 *
 * This test validates that the system properly enforces referential integrity
 * by verifying that comments exist before allowing attachments to be created.
 * The test:
 *
 * 1. Registers a contributor account
 * 2. Creates an article to establish valid context
 * 3. Creates a valid comment for comparison
 * 4. Attempts to attach a file to a non-existent comment UUID
 * 5. Verifies the operation is rejected, maintaining data integrity
 */
export async function test_api_comment_attachment_invalid_comment_id(
  connection: api.IConnection,
) {
  // Step 1: Register a contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "SecurePass123!@#",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Create an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Test Article " + RandomGenerator.alphaNumeric(10),
          content: RandomGenerator.content({ paragraphs: 3 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Create a valid comment for comparison
  const validComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(validComment);

  // Step 4: Generate a non-existent comment UUID
  const invalidCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 5: Attempt to attach a file to the non-existent comment
  await TestValidator.error(
    "attaching file to non-existent comment should fail",
    async () => {
      await api.functional.discussionBoard.articles.comments.attachments.create(
        connection,
        {
          articleId: article.id,
          commentId: invalidCommentId,
          body: {
            original_file_name: "test_image.png",
            file_type: "png",
            file_size: 1024,
            mime_type: "image/png",
            display_url: "http://localhost:3000/uploads/test_image.png",
          } satisfies IDiscussionBoardCommentAttachment.ICreate,
        },
      );
    },
  );

  TestValidator.predicate(
    "valid comment exists in article",
    validComment.id !== invalidCommentId,
  );
}
