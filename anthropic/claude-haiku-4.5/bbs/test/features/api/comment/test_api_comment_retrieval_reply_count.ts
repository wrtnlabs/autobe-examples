import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that reply_count field is properly updated and returned when retrieving
 * a comment that has received multiple replies.
 *
 * This test validates the cached reply count functionality by creating an
 * article, posting a parent comment, and then verifying that the reply_count
 * increments correctly as replies are added. This ensures efficient discussion
 * display without needing full child comment queries.
 *
 * Test flow:
 *
 * 1. Create contributor account
 * 2. Create and publish an article
 * 3. Post a top-level parent comment (reply_count should be 0)
 * 4. Retrieve parent comment and verify reply_count=0
 * 5. Post first reply to parent comment
 * 6. Retrieve parent comment and verify reply_count=1
 * 7. Post second reply to parent comment
 * 8. Retrieve parent comment and verify reply_count=2
 */
export async function test_api_comment_retrieval_reply_count(
  connection: api.IConnection,
) {
  // 1. Create contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(10),
        password: "SecurePass123!",
        href: "http://example.com/register",
        referrer: "http://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // 2. Create and publish an article
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 7,
          }),
          categoryId: categoryId,
          href: "http://example.com/create-article",
          referrer: "http://example.com",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Create a moderator and publish the article
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: "ModeratorPass123!",
    } satisfies IDiscussionBoardModerator.ICreate,
  });

  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      href: "http://example.com/login",
      referrer: "http://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  await api.functional.discussionBoard.moderator.articles.approve(connection, {
    articleId: article.id,
    body: {
      approvalNotes: "Article approved for publication",
    } satisfies IDiscussionBoardArticle.IApprove,
  });

  // Switch back to contributor for posting comments
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: "SecurePass123!",
      href: "http://example.com/login",
      referrer: "http://example.com",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // 3. Post a top-level parent comment
  const parentComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parentComment);

  // 4. Retrieve parent comment and verify reply_count=0
  let retrievedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.at(connection, {
      articleId: article.id,
      commentId: parentComment.id,
    });
  typia.assert(retrievedComment);
  TestValidator.equals(
    "initial parent comment reply_count should be 0",
    retrievedComment.reply_count,
    0,
  );

  // 5. Post first reply to parent comment
  const firstReply: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          parentCommentId: parentComment.id,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(firstReply);

  // 6. Retrieve parent comment and verify reply_count=1
  retrievedComment = await api.functional.discussionBoard.articles.comments.at(
    connection,
    {
      articleId: article.id,
      commentId: parentComment.id,
    },
  );
  typia.assert(retrievedComment);
  TestValidator.equals(
    "parent comment reply_count should be 1 after first reply",
    retrievedComment.reply_count,
    1,
  );

  // 7. Post second reply to parent comment
  const secondReply: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          parentCommentId: parentComment.id,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(secondReply);

  // 8. Retrieve parent comment and verify reply_count=2
  retrievedComment = await api.functional.discussionBoard.articles.comments.at(
    connection,
    {
      articleId: article.id,
      commentId: parentComment.id,
    },
  );
  typia.assert(retrievedComment);
  TestValidator.equals(
    "parent comment reply_count should be 2 after second reply",
    retrievedComment.reply_count,
    2,
  );
}
