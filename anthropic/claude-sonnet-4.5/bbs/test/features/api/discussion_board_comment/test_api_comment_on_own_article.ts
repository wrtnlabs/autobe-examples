import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the scenario where a member posts a comment on their own article.
 *
 * This validates that article authors can participate in discussions on their
 * own content. The test ensures:
 *
 * 1. Member can successfully create an article
 * 2. Same member can comment on their own article
 * 3. Comment is properly associated with both the article and the member
 * 4. All relationship data is correctly populated
 *
 * This tests self-engagement patterns common in discussion platforms.
 */
export async function test_api_comment_on_own_article(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "test1234";
  const memberUsername = RandomGenerator.name(1);

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: memberUsername,
        href: "https://discussion.example.com/join",
        referrer: "https://discussion.example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create an article as this member
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Post a comment on own article as the same member
  const commentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Verify the comment was created successfully
  TestValidator.equals(
    "comment content matches input",
    comment.content,
    commentContent,
  );

  // Step 5: Confirm the article author and comment author are the same member
  TestValidator.equals(
    "comment author ID matches member ID",
    comment.member.id,
    member.id,
  );

  TestValidator.equals(
    "comment author ID matches article author ID",
    comment.member.id,
    article.author.id,
  );

  TestValidator.equals(
    "comment author username matches member username",
    comment.member.username,
    member.username,
  );

  // Step 6: Validate the comment correctly references the article
  TestValidator.equals(
    "comment article ID matches created article ID",
    comment.discussion_board_article_id,
    article.id,
  );

  TestValidator.equals(
    "comment article reference matches created article",
    comment.article.id,
    article.id,
  );

  TestValidator.equals(
    "comment article title matches",
    comment.article.title,
    article.title,
  );
}
