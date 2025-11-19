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
 * Test retrieving a published comment from a published article without
 * authentication.
 *
 * This test validates that public comments on published articles are accessible
 * to any user (authenticated or unauthenticated). The scenario creates test
 * data through an authenticated session, then retrieves the comment using an
 * unauthenticated connection with empty headers to ensure public access is
 * properly implemented.
 *
 * The test flow:
 *
 * 1. Register a contributor account and authenticate
 * 2. Create an article draft with required fields
 * 3. Register a moderator account and authenticate as moderator
 * 4. Approve and publish the article
 * 5. Switch back to contributor and post a comment on the published article
 * 6. Create an unauthenticated connection (empty headers) for public access
 * 7. Retrieve the comment using the unauthenticated connection
 * 8. Verify complete comment details are returned (id, content, author,
 *    timestamps, counts, etc.)
 * 9. Verify article_publication_status is 'published'
 * 10. Verify is_deleted is false
 * 11. Verify all nested structures (author, article, attachments) are properly
 *     populated
 */
export async function test_api_comment_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "TestPassword123!@#";
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphabets(10),
      password: contributorPassword,
      href: "http://localhost/register",
      referrer: "http://localhost",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Create an article draft
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article =
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
          }),
          categoryId: categoryId,
          href: "http://localhost/article/create",
          referrer: "http://localhost",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals("article status is draft", article.status, "draft");

  // Step 3: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123!@#";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Switch to moderator and approve article
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost/moderator/login",
      referrer: "http://localhost",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const approvedArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: article.id,
        body: {
          approvalNotes: "Article meets community guidelines",
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvedArticle);
  TestValidator.equals(
    "article status is published",
    approvedArticle.status,
    "published",
  );

  // Step 5: Switch back to contributor and post comment
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: contributorPassword,
      href: "http://localhost/contributor/login",
      referrer: "http://localhost",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  const comment =
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
  typia.assert(comment);

  // Step 6: Create unauthenticated connection for public access
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 7: Retrieve comment without authentication
  const retrievedComment =
    await api.functional.discussionBoard.articles.comments.at(
      publicConnection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(retrievedComment);

  // Step 8-11: Verify all comment details
  TestValidator.equals("comment id matches", retrievedComment.id, comment.id);
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    comment.content,
  );
  TestValidator.equals(
    "comment edit count is zero",
    retrievedComment.edit_count,
    0,
  );
  TestValidator.equals(
    "comment reply count is zero",
    retrievedComment.reply_count,
    0,
  );
  TestValidator.equals(
    "comment not deleted",
    retrievedComment.is_deleted,
    false,
  );
  TestValidator.equals(
    "article publication status is published",
    retrievedComment.article_publication_status,
    "published",
  );

  // Verify author information
  TestValidator.equals(
    "author username matches contributor",
    retrievedComment.author.username,
    contributor.username,
  );

  // Verify article information
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

  // Verify attachments array exists
  TestValidator.predicate(
    "attachments array is present",
    Array.isArray(retrievedComment.attachments),
  );
}
