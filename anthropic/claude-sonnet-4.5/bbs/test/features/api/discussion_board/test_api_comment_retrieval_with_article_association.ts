import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that the retrieved comment correctly reflects its association with the
 * parent article.
 *
 * This test validates referential integrity and relationship correctness
 * between comments and articles in the discussion board system. It ensures that
 * when a comment is retrieved, all article-related information is correctly
 * embedded and accessible.
 *
 * Test flow:
 *
 * 1. Create a member account for authentication
 * 2. Create an article with specific identifiable content
 * 3. Post a comment on that article
 * 4. Retrieve the comment using the GET endpoint
 * 5. Verify the comment's discussion_board_article_id matches the article's id
 * 6. Verify the embedded article summary contains correct details (title,
 *    view_count, author)
 * 7. Confirm the article context provides complete information for user
 *    understanding
 */
export async function test_api_comment_retrieval_with_article_association(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<20>>(),
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create an article with specific identifiable content
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const articleData = {
    title: articleTitle,
    body: articleBody,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Post a comment on that article
  const commentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });

  const commentData = {
    content: commentContent,
  } satisfies IDiscussionBoardComment.ICreate;

  const createdComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(createdComment);

  // Step 4: Retrieve the comment using the GET endpoint
  const retrievedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.at(connection, {
      articleId: article.id,
      commentId: createdComment.id,
    });
  typia.assert(retrievedComment);

  // Step 5: Verify the comment's discussion_board_article_id matches the article's id
  TestValidator.equals(
    "comment discussion_board_article_id matches article id",
    retrievedComment.discussion_board_article_id,
    article.id,
  );

  // Step 6: Verify the embedded article summary contains correct article details
  TestValidator.equals(
    "embedded article summary id matches",
    retrievedComment.article.id,
    article.id,
  );

  TestValidator.equals(
    "embedded article summary title matches",
    retrievedComment.article.title,
    article.title,
  );

  TestValidator.equals(
    "embedded article summary view_count matches",
    retrievedComment.article.view_count,
    article.view_count,
  );

  // Step 7: Verify the author information in the embedded article summary
  TestValidator.equals(
    "embedded article author id matches",
    retrievedComment.article.author.id,
    member.id,
  );

  TestValidator.equals(
    "embedded article author username matches",
    retrievedComment.article.author.username,
    member.username,
  );

  TestValidator.equals(
    "embedded article author email matches",
    retrievedComment.article.author.email,
    member.email,
  );
}
