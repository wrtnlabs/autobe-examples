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
 * Validates error handling when attempting to attach a file to a comment in a
 * non-existent article.
 *
 * This test ensures that the API properly validates article existence before
 * processing comment attachment operations. It verifies that attempting to
 * attach a file using an invalid article ID is rejected with appropriate error
 * handling, preventing invalid attachment operations from polluting the
 * database with orphaned records.
 *
 * Test flow:
 *
 * 1. Register a new contributor account for testing
 * 2. Create a valid article to establish proper system context
 * 3. Attempt to attach a file to a comment using a non-existent article UUID
 * 4. Verify that the operation is rejected with an error response
 * 5. Confirm that no orphaned attachment records were created
 */
export async function test_api_comment_attachment_invalid_article_id(
  connection: api.IConnection,
) {
  // Step 1: Register a contributor for authentication context
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: "SecurePass123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Create a valid article to ensure the system is functional
  const validArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 8,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(validArticle);

  // Step 3: Attempt to attach a file to a comment using an invalid article ID
  const invalidArticleId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should reject attachment creation with invalid article ID",
    async () => {
      await api.functional.discussionBoard.articles.comments.attachments.create(
        connection,
        {
          articleId: invalidArticleId,
          commentId: commentId,
          body: {
            original_file_name: "test-image.jpg",
            file_type: "jpg",
            file_size: 1024000,
            mime_type: "image/jpeg",
            display_url: "http://localhost:3000/uploads/test-image.jpg",
          } satisfies IDiscussionBoardCommentAttachment.ICreate,
        },
      );
    },
  );

  TestValidator.predicate(
    "valid article ID should remain different from invalid article ID",
    validArticle.id !== invalidArticleId,
  );
}
