import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that retrieving a specific comment returns only that comment and not
 * other comments on the same article.
 *
 * This test validates proper comment isolation and endpoint specificity by:
 *
 * 1. Creating a member account for authentication
 * 2. Creating an article to receive multiple test comments
 * 3. Posting multiple comments with distinct content on the same article
 * 4. Retrieving each comment individually by its commentId
 * 5. Verifying each retrieval returns only the requested comment with correct
 *    content
 * 6. Confirming the comment id matches the requested commentId parameter
 * 7. Ensuring other comments are not included in the response
 */
export async function test_api_comment_retrieval_multiple_comments_isolation(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create an article to receive multiple comments
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Post multiple comments with distinct, identifiable content
  const commentCount = 3;
  const createdComments: IDiscussionBoardComment[] =
    await ArrayUtil.asyncRepeat(commentCount, async (index) => {
      const commentData = {
        content: `This is unique comment number ${index + 1}: ${RandomGenerator.paragraph({ sentences: 5 })}`,
      } satisfies IDiscussionBoardComment.ICreate;

      const comment: IDiscussionBoardComment =
        await api.functional.discussionBoard.member.articles.comments.create(
          connection,
          {
            articleId: article.id,
            body: commentData,
          },
        );
      typia.assert(comment);
      return comment;
    });

  // Step 4-7: Retrieve each comment individually and verify isolation
  await ArrayUtil.asyncForEach(
    createdComments,
    async (expectedComment, index) => {
      // Retrieve the specific comment by its commentId
      const retrievedComment: IDiscussionBoardComment =
        await api.functional.discussionBoard.articles.comments.at(connection, {
          articleId: article.id,
          commentId: expectedComment.id,
        });
      typia.assert(retrievedComment);

      // Verify the comment id matches the requested commentId
      TestValidator.equals(
        `comment ${index + 1} id should match requested commentId`,
        retrievedComment.id,
        expectedComment.id,
      );

      // Verify the comment content matches the original unique content
      TestValidator.equals(
        `comment ${index + 1} content should match original`,
        retrievedComment.content,
        expectedComment.content,
      );

      // Verify only one comment is returned (structural validation)
      TestValidator.predicate(
        `comment ${index + 1} should be a single comment object, not an array`,
        typeof retrievedComment === "object" &&
          !Array.isArray(retrievedComment),
      );

      // Verify the article reference is correct
      TestValidator.equals(
        `comment ${index + 1} should belong to the correct article`,
        retrievedComment.discussion_board_article_id,
        article.id,
      );

      // Verify the member reference is correct
      TestValidator.equals(
        `comment ${index + 1} should belong to the correct member`,
        retrievedComment.member_id,
        member.id,
      );
    },
  );
}
