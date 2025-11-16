import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate retrieval of a discussion board comment for an authenticated user.
 *
 * This test executes the following business scenario:
 *
 * 1. Register a new user (member) and obtain authorization for subsequent
 *    operations.
 * 2. Create a new article as the registered user.
 * 3. Post a comment to the article as the same user.
 * 4. Retrieve the posted comment by its unique ID using the authenticated context.
 *
 * Assertions:
 *
 * - The retrieved comment's `id` matches the created comment's ID.
 * - The `body` and `attachments` arrays match those provided in creation.
 * - The `author` of the comment reflects the correct user summary.
 * - The `article` context in the comment matches the originally created article's
 *   summary.
 */
export async function test_api_discussion_board_comment_retrieval_by_authorized_user(
  connection: api.IConnection,
) {
  // 1. Register a new user (member) and get authorization
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.Format<"password">>();
  const userJoinBody = {
    email: userEmail,
    password: userPassword,
    href: "https://discussionboard.test/join",
    referrer: "https://discussionboard.test/",
    ip: null,
  } satisfies IDiscussionBoardUser.ICreate;
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinBody });
  typia.assert(user);

  // 2. Create a new article as the registered user
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 20,
      sentenceMax: 40,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: articleCreateBody,
    });
  typia.assert(article);

  // 3. Post a comment to the article as the same user
  const commentBodyText = RandomGenerator.paragraph({ sentences: 4 });
  // Optionally include up to 2 attachments
  const attachments = ArrayUtil.repeat(2, (i) => ({
    file_url: `https://cdn.test/attachment${i + 1}.jpg`,
    original_filename: `file${i + 1}.jpg`,
    mime_type: "image/jpeg",
    file_size_bytes: 1024 * (i + 1),
  })) satisfies IDiscussionBoardCommentAttachment.ICreate[];
  const commentCreateBody = {
    discussion_board_article_id: article.id,
    body: commentBodyText,
    attachments,
  } satisfies IDiscussionBoardComment.ICreate;
  const createdComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.user.comments.create(connection, {
      body: commentCreateBody,
    });
  typia.assert(createdComment);

  // 4. Retrieve the posted comment by its ID
  const retrievedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.comments.at(connection, {
      commentId: createdComment.id,
    });
  typia.assert(retrievedComment);

  // Validate that the retrieved comment matches what was created
  TestValidator.equals(
    "comment id matches",
    retrievedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "comment body matches",
    retrievedComment.body,
    commentCreateBody.body,
  );
  // Author summary must match (ID and email)
  TestValidator.equals(
    "author id matches",
    (retrievedComment.author as IDiscussionBoardUser.ISummary).id,
    user.id,
  );
  TestValidator.equals(
    "author email matches",
    (retrievedComment.author as IDiscussionBoardUser.ISummary).email,
    user.email,
  );
  // Article context matches
  TestValidator.equals(
    "article id matches",
    retrievedComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title matches",
    retrievedComment.article.title,
    article.title,
  );
  // Attachments match by length and filenames
  TestValidator.equals(
    "attachments length",
    retrievedComment.attachments.length,
    attachments.length,
  );
  ArrayUtil.repeat(attachments.length, (i) => {
    TestValidator.equals(
      `attachment[${i}] filename matches`,
      retrievedComment.attachments[i]?.original_filename,
      attachments[i]?.original_filename,
    );
    TestValidator.equals(
      `attachment[${i}] file_url matches`,
      retrievedComment.attachments[i]?.file_url,
      attachments[i]?.file_url,
    );
    TestValidator.equals(
      `attachment[${i}] mime_type matches`,
      retrievedComment.attachments[i]?.mime_type,
      attachments[i]?.mime_type,
    );
    TestValidator.equals(
      `attachment[${i}] file_size_bytes matches`,
      retrievedComment.attachments[i]?.file_size_bytes,
      attachments[i]?.file_size_bytes,
    );
  });
}
