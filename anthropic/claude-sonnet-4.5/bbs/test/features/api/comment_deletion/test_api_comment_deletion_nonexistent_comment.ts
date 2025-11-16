import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test attempting to delete a comment that does not exist or has already been
 * deleted.
 *
 * This scenario validates error handling for invalid comment references. The
 * test creates a member account and an article, then attempts to delete a
 * comment using a non-existent or invalid comment ID (a randomly generated UUID
 * that doesn't correspond to any comment in the database).
 *
 * The operation should return an appropriate error response indicating the
 * comment was not found. This validates proper error handling and prevents
 * undefined behavior when operating on non-existent resources.
 *
 * Steps:
 *
 * 1. Create and authenticate a member account
 * 2. Create a discussion board article to provide valid context
 * 3. Generate a random non-existent comment UUID
 * 4. Attempt to delete the non-existent comment
 * 5. Verify that the operation fails with an appropriate error
 */
export async function test_api_comment_deletion_nonexistent_comment(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create a discussion board article to provide valid context
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 3: Generate a random non-existent comment UUID
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // Step 4 & 5: Attempt to delete the non-existent comment and verify error
  await TestValidator.error(
    "deleting non-existent comment should fail",
    async () => {
      await api.functional.discussionBoard.member.articles.comments.erase(
        connection,
        {
          articleId: article.id,
          commentId: nonExistentCommentId,
        },
      );
    },
  );
}
