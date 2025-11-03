import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_comment_reply_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create a member account (will create the reply)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);
  const memberPassword = "SecurePass123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create a moderator account (needed to create category)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const moderatorPassword = "ModPass123!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create a category (required for article)
  const categoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const categoryDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to member authentication by re-authenticating
  connection.headers = {
    ...connection.headers,
    Authorization: member.token.access,
  };

  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
  });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: articleTitle,
        body: articleBody,
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Create a parent top-level comment
  const parentCommentContent = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 10,
  });

  const parentComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          discussion_board_parent_comment_id: null,
          content: parentCommentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parentComment);

  // Step 6: Create a reply to the parent comment (TARGET OPERATION)
  const replyContent = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 4,
    wordMax: 9,
  });

  const reply =
    await api.functional.discussionBoard.member.articles.comments.replies.create(
      connection,
      {
        articleId: article.id,
        commentId: parentComment.id,
        body: {
          discussion_board_article_id: article.id,
          discussion_board_parent_comment_id: parentComment.id,
          content: replyContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(reply);

  // Step 7: Validation - Verify reply structure and content
  TestValidator.equals("reply content matches", reply.content, replyContent);
  TestValidator.equals(
    "reply author type is member",
    reply.author_type,
    "member",
  );
  TestValidator.equals(
    "reply member ID matches",
    reply.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "reply parent comment ID matches",
    reply.discussion_board_parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "reply article ID matches",
    reply.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals("reply is not deleted", reply.deleted_at, null);
  TestValidator.predicate(
    "reply has created_at timestamp",
    reply.created_at !== null && reply.created_at !== undefined,
  );
  TestValidator.predicate(
    "reply has updated_at timestamp",
    reply.updated_at !== null && reply.updated_at !== undefined,
  );

  // Verify author details are populated
  TestValidator.predicate(
    "reply has member author details",
    reply.memberAuthor !== null && reply.memberAuthor !== undefined,
  );
  if (reply.memberAuthor) {
    TestValidator.equals(
      "member author ID matches",
      reply.memberAuthor.id,
      member.id,
    );
    TestValidator.equals(
      "member author username matches",
      reply.memberAuthor.username,
      member.username,
    );
  }

  // Verify moderator author is null (since this is a member reply)
  TestValidator.equals(
    "reply has no moderator author",
    reply.moderatorAuthor,
    null,
  );
}
