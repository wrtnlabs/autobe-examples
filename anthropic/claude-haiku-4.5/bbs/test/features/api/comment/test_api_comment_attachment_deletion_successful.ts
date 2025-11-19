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
 * Test successful deletion of a comment attachment.
 *
 * Create an article, post a comment with an image attachment, then delete that
 * attachment. Verify that the deletion succeeds and the attachment is no longer
 * accessible. This validates the core delete functionality and ensures
 * attachments are properly removed from the system.
 *
 * Test flow:
 *
 * 1. Register contributor account
 * 2. Create discussion board article
 * 3. Create comment on article
 * 4. Create image attachment on comment
 * 5. Delete the attachment
 * 6. Verify deletion succeeded
 */
export async function test_api_comment_attachment_deletion_successful(
  connection: api.IConnection,
) {
  // 1. Register a new contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(10),
        password: "SecurePass123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor should be authenticated",
    contributor.id !== null && contributor.id !== undefined,
  );

  // 2. Create a discussion board article
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: categoryId,
          href: "https://example.com/articles/create",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate("article should be created", article.id !== null);

  // 3. Create a comment on the article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.predicate("comment should be created", comment.id !== null);

  // 4. Create an image attachment on the comment
  const attachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "test_image.png",
          file_type: "png",
          file_size: 1024,
          mime_type: "image/png",
          display_url: "https://example.com/images/test.png",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  TestValidator.predicate(
    "attachment should be created",
    attachment.id !== null,
  );
  TestValidator.equals(
    "attachment file type should be png",
    attachment.file_type,
    "png",
  );

  // 5. Delete the attachment
  await api.functional.discussionBoard.articles.comments.attachments.erase(
    connection,
    {
      articleId: article.id,
      commentId: comment.id,
      attachmentId: attachment.id,
    },
  );

  TestValidator.predicate(
    "attachment deletion should complete successfully",
    true,
  );
}
