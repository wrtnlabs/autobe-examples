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

export async function test_api_moderator_reply_to_member_comment(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberEmail = `${RandomGenerator.alphaNumeric(10)}@test.com`;
  const memberPassword = RandomGenerator.alphaNumeric(12) + "Aa1!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create a moderator account
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderatorEmail = `${RandomGenerator.alphaNumeric(10)}@moderator.com`;
  const moderatorPassword = RandomGenerator.alphaNumeric(12) + "Aa1!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/register",
      referrer: "https://example.com/moderator/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: As moderator, create a category
  const categoryName = RandomGenerator.name(2);
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch to member account by setting member's auth token
  connection.headers = connection.headers || {};
  connection.headers.Authorization = member.token.access;

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

  // Step 5: As member, post a top-level comment on the article
  const memberCommentContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 15,
  });

  const memberComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          content: memberCommentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(memberComment);

  // Step 6: Switch to moderator account by setting moderator's auth token
  connection.headers.Authorization = moderator.token.access;

  const moderatorReplyContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 12,
  });

  const moderatorReply =
    await api.functional.discussionBoard.moderator.articles.comments.replies.create(
      connection,
      {
        articleId: article.id,
        commentId: memberComment.id,
        body: {
          discussion_board_article_id: article.id,
          discussion_board_parent_comment_id: memberComment.id,
          content: moderatorReplyContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(moderatorReply);

  // Step 7: Validate moderator reply attribution
  TestValidator.equals(
    "moderator reply author_type is moderator",
    moderatorReply.author_type,
    "moderator",
  );
  TestValidator.predicate(
    "moderator reply has moderator_id set",
    moderatorReply.discussion_board_moderator_id !== null &&
      moderatorReply.discussion_board_moderator_id !== undefined,
  );
  TestValidator.equals(
    "moderator reply member_id is null",
    moderatorReply.discussion_board_member_id,
    null,
  );
  TestValidator.equals(
    "moderator reply content matches",
    moderatorReply.content,
    moderatorReplyContent,
  );

  // Step 8: Validate threading relationship
  TestValidator.equals(
    "moderator reply parent_comment_id matches member comment",
    moderatorReply.discussion_board_parent_comment_id,
    memberComment.id,
  );
  TestValidator.equals(
    "moderator reply article_id matches article",
    moderatorReply.discussion_board_article_id,
    article.id,
  );

  // Step 9: Verify member comment maintains member author type
  TestValidator.equals(
    "member comment author_type is member",
    memberComment.author_type,
    "member",
  );
  TestValidator.predicate(
    "member comment has member_id set",
    memberComment.discussion_board_member_id !== null &&
      memberComment.discussion_board_member_id !== undefined,
  );
  TestValidator.equals(
    "member comment moderator_id is null",
    memberComment.discussion_board_moderator_id,
    null,
  );
  const memberParentId = memberComment.discussion_board_parent_comment_id;
  TestValidator.predicate(
    "member comment parent_comment_id is null for top-level",
    memberParentId === null || memberParentId === undefined,
  );
  TestValidator.equals(
    "member comment content matches",
    memberComment.content,
    memberCommentContent,
  );

  // Step 10: Verify moderatorAuthor and memberAuthor fields are correctly populated
  TestValidator.predicate(
    "moderator reply has moderatorAuthor populated",
    moderatorReply.moderatorAuthor !== null &&
      moderatorReply.moderatorAuthor !== undefined,
  );
  TestValidator.equals(
    "moderator reply memberAuthor is null",
    moderatorReply.memberAuthor,
    null,
  );
  TestValidator.predicate(
    "member comment has memberAuthor populated",
    memberComment.memberAuthor !== null &&
      memberComment.memberAuthor !== undefined,
  );
  TestValidator.equals(
    "member comment moderatorAuthor is null",
    memberComment.moderatorAuthor,
    null,
  );

  // Step 11: Verify cross-actor threading works correctly
  TestValidator.equals(
    "both comments belong to same article",
    memberComment.discussion_board_article_id,
    moderatorReply.discussion_board_article_id,
  );
  TestValidator.predicate(
    "member comment is top-level",
    memberComment.discussion_board_parent_comment_id === null ||
      memberComment.discussion_board_parent_comment_id === undefined,
  );
  TestValidator.predicate(
    "moderator reply is child of member comment",
    moderatorReply.discussion_board_parent_comment_id === memberComment.id,
  );
}
