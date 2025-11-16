import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test comment creation with various content lengths to validate the 1-2000
 * character constraint.
 *
 * This test validates that the discussion board comment system properly handles
 * comment content of varying lengths within the valid range (1-2000
 * characters). It ensures that:
 *
 * 1. Minimum valid length (1 character) comments are accepted and stored correctly
 * 2. Maximum valid length (2000 characters) comments are accepted and stored
 *    correctly
 * 3. Typical content length (~500 characters) comments work as expected
 * 4. All comment data is properly stored and can be retrieved with correct content
 *
 * The test follows a complete workflow:
 *
 * - Member registration and authentication
 * - Article creation as comment target
 * - Comment posting with different content lengths
 * - Validation of stored content accuracy
 */
export async function test_api_comment_content_length_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member for posting comments
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "test1234",
        username: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a test article as the target for comments
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Test minimum valid length (1 character)
  const minLengthContent = "a";
  const minComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: minLengthContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(minComment);
  TestValidator.equals(
    "minimum length comment content matches",
    minComment.content,
    minLengthContent,
  );
  TestValidator.equals(
    "minimum length comment article ID matches",
    minComment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "minimum length comment member ID matches",
    minComment.member_id,
    member.id,
  );

  // Step 4: Test typical content length (~500 characters)
  const typicalLengthContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 15,
    sentenceMax: 20,
    wordMin: 5,
    wordMax: 8,
  }).substring(0, 500);
  const typicalComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: typicalLengthContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(typicalComment);
  TestValidator.equals(
    "typical length comment content matches",
    typicalComment.content,
    typicalLengthContent,
  );
  TestValidator.equals(
    "typical length comment article ID matches",
    typicalComment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "typical length comment member ID matches",
    typicalComment.member_id,
    member.id,
  );

  // Step 5: Test maximum valid length (2000 characters)
  const maxLengthContent = RandomGenerator.alphabets(2000);
  const maxComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: maxLengthContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(maxComment);
  TestValidator.equals(
    "maximum length comment content matches",
    maxComment.content,
    maxLengthContent,
  );
  TestValidator.equals(
    "maximum length comment content length is 2000",
    maxComment.content.length,
    2000,
  );
  TestValidator.equals(
    "maximum length comment article ID matches",
    maxComment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "maximum length comment member ID matches",
    maxComment.member_id,
    member.id,
  );
}
