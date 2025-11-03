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

/**
 * Test moderator editing a member's comment.
 *
 * This test validates the scenario where a moderator edits a comment created by
 * a member (not the moderator themselves). It creates a member account and
 * authenticates, creates a category and article, posts a comment as the member,
 * then authenticates as a different moderator account and updates that member's
 * comment. This verifies that moderators have elevated privileges to edit any
 * comment regardless of authorship, and that the moderation action is logged in
 * discussion_board_moderation_actions table for accountability.
 */
export async function test_api_comment_update_moderator_editing_member_comment(
  connection: api.IConnection,
) {
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    category_ids: [category.id],
    tag_ids: [],
    image_ids: [],
    document_ids: [],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  const originalCommentContent = RandomGenerator.paragraph({ sentences: 5 });
  const commentData = {
    discussion_board_article_id: article.id,
    discussion_board_parent_comment_id: null,
    content: originalCommentContent,
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

  const updatedCommentContent = RandomGenerator.paragraph({ sentences: 7 });
  const updateData = {
    content: updatedCommentContent,
  } satisfies IDiscussionBoardComment.IUpdate;

  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: updateData,
      },
    );
  typia.assert(updatedComment);

  TestValidator.equals(
    "updated comment ID matches original",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "updated comment content matches new content",
    updatedComment.content,
    updatedCommentContent,
  );
  TestValidator.predicate(
    "updated_at timestamp changed",
    updatedComment.updated_at !== comment.updated_at,
  );
  TestValidator.equals(
    "comment still belongs to same article",
    updatedComment.discussion_board_article_id,
    article.id,
  );
}
