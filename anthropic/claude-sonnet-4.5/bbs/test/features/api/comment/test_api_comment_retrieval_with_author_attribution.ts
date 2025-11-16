import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that retrieved comments include complete and accurate author
 * information.
 *
 * This validates proper author attribution critical for discussion
 * accountability. The test:
 *
 * 1. Creates a member with specific identifiable attributes (username, email)
 * 2. Creates an article as that member
 * 3. Creates a comment on the article as that member
 * 4. Retrieves the comment via GET endpoint
 * 5. Verifies the member_id in the comment matches the author's id
 * 6. Verifies the embedded member summary includes correct author details
 * 7. Confirms author information is sufficient for displaying comment attribution
 */
export async function test_api_comment_retrieval_with_author_attribution(
  connection: api.IConnection,
) {
  // Step 1: Create a member with identifiable attributes
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create an article as this member
  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Create a comment on the article as this member
  const commentContent = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const createdComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(createdComment);

  // Step 4: Retrieve the comment via GET endpoint
  const retrievedComment =
    await api.functional.discussionBoard.articles.comments.at(connection, {
      articleId: article.id,
      commentId: createdComment.id,
    });
  typia.assert(retrievedComment);

  // Step 5: Verify the member_id matches the author's id
  TestValidator.equals(
    "comment member_id matches author id",
    retrievedComment.member_id,
    member.id,
  );

  // Step 6: Verify the embedded member summary includes correct author details
  TestValidator.equals(
    "embedded member id matches",
    retrievedComment.member.id,
    member.id,
  );

  TestValidator.equals(
    "embedded member username matches",
    retrievedComment.member.username,
    memberUsername,
  );

  TestValidator.equals(
    "embedded member email matches",
    retrievedComment.member.email,
    memberEmail,
  );

  TestValidator.equals(
    "embedded member status is correct",
    retrievedComment.member.status,
    member.status,
  );

  TestValidator.equals(
    "embedded member email_verified matches",
    retrievedComment.member.email_verified,
    member.email_verified,
  );

  TestValidator.equals(
    "embedded member created_at matches",
    retrievedComment.member.created_at,
    member.created_at,
  );

  // Step 7: Verify comment content and article reference are correct
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    commentContent,
  );

  TestValidator.equals(
    "comment article_id matches",
    retrievedComment.discussion_board_article_id,
    article.id,
  );

  TestValidator.equals(
    "embedded article id matches",
    retrievedComment.article.id,
    article.id,
  );

  TestValidator.equals(
    "embedded article title matches",
    retrievedComment.article.title,
    article.title,
  );
}
