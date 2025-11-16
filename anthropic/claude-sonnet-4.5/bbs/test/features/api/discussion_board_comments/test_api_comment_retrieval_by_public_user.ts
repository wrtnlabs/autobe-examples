import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_comment_retrieval_by_public_user(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for setting up test data
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123!";
  const memberUsername = RandomGenerator.name(2);

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: memberUsername,
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create an article as the authenticated member
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleBody = RandomGenerator.content({ paragraphs: 2 });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Post a comment on the article
  const commentContent = RandomGenerator.paragraph({ sentences: 5 });

  const createdComment: IDiscussionBoardComment =
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

  // Step 4: Create unauthenticated connection for public user access
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  // Step 5: Retrieve the comment as a public user without authentication
  const retrievedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.at(
      publicConnection,
      {
        articleId: article.id,
        commentId: createdComment.id,
      },
    );
  typia.assert(retrievedComment);

  // Step 6: Validate the retrieved comment matches the created comment
  TestValidator.equals(
    "comment ID matches",
    retrievedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment article ID matches",
    retrievedComment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment member ID matches",
    retrievedComment.member_id,
    member.id,
  );

  // Step 7: Validate member information is properly included
  TestValidator.equals(
    "comment author ID matches member",
    retrievedComment.member.id,
    member.id,
  );
  TestValidator.equals(
    "comment author username matches",
    retrievedComment.member.username,
    memberUsername,
  );
  TestValidator.equals(
    "comment author email matches",
    retrievedComment.member.email,
    memberEmail,
  );

  // Step 8: Validate article information is properly included
  TestValidator.equals(
    "comment article ID matches",
    retrievedComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "comment article title matches",
    retrievedComment.article.title,
    articleTitle,
  );
  TestValidator.equals(
    "comment article author matches",
    retrievedComment.article.author.id,
    member.id,
  );
}
