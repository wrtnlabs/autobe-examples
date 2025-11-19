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
 * Test that display URLs are correctly generated and accessible for comment
 * attachments.
 *
 * This test validates the complete workflow of attaching images to comments in
 * the discussion board system. It verifies that:
 *
 * 1. Contributors can register and authenticate
 * 2. Articles can be created for discussion
 * 3. Comments can be posted on articles
 * 4. Image attachments can be added to comments
 * 5. Display URLs are properly formatted and unique for each attachment
 * 6. Display URLs follow valid URI format for web embedding
 *
 * The test ensures attachment URLs are properly structured for frontend
 * integration and enables image embedding in discussion threads.
 */
export async function test_api_comment_attachment_display_url_generation(
  connection: api.IConnection,
) {
  // Step 1: Register a contributor
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "SecurePass123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor registered successfully",
    () => !!contributor.id,
  );

  // Step 2: Create an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 4,
            wordMax: 8,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate("article created successfully", () => !!article.id);

  // Step 3: Create a comment on the article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 6,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.predicate("comment created successfully", () => !!comment.id);

  // Step 4: Create first comment attachment with image
  const attachment1: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "test-image-1.png",
          file_type: "png",
          file_size: 102400, // 100KB
          mime_type: "image/png",
          display_url: "http://localhost:3000/attachments/image-001.png",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment1);
  TestValidator.predicate("first attachment display_url is valid URI", () =>
    /^https?:\/\/|^\//.test(attachment1.display_url),
  );
  TestValidator.predicate(
    "first attachment has proper format",
    () =>
      !!attachment1.display_url && typeof attachment1.display_url === "string",
  );

  // Step 5: Create second comment attachment with different image
  const attachment2: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "test-image-2.jpg",
          file_type: "jpg",
          file_size: 153600, // 150KB
          mime_type: "image/jpeg",
          display_url: "http://localhost:3000/attachments/image-002.jpg",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment2);
  TestValidator.predicate("second attachment display_url is valid URI", () =>
    /^https?:\/\/|^\//.test(attachment2.display_url),
  );
  TestValidator.predicate(
    "second attachment has proper format",
    () =>
      !!attachment2.display_url && typeof attachment2.display_url === "string",
  );

  // Step 6: Verify attachments have unique display URLs
  TestValidator.notEquals(
    "attachments have different display URLs",
    attachment1.display_url,
    attachment2.display_url,
  );

  // Step 7: Verify display URLs are accessible and properly structured
  TestValidator.predicate(
    "display URLs contain proper path information",
    () => {
      const url1Valid =
        attachment1.display_url.includes("attachments") ||
        attachment1.display_url.includes("image");
      const url2Valid =
        attachment2.display_url.includes("attachments") ||
        attachment2.display_url.includes("image");
      return url1Valid && url2Valid;
    },
  );

  // Step 8: Verify attachment metadata is preserved
  TestValidator.equals(
    "first attachment original filename preserved",
    attachment1.original_file_name,
    "test-image-1.png",
  );
  TestValidator.equals(
    "second attachment original filename preserved",
    attachment2.original_file_name,
    "test-image-2.jpg",
  );

  // Step 9: Verify file types are correctly stored
  TestValidator.equals(
    "first attachment file type",
    attachment1.file_type,
    "png",
  );
  TestValidator.equals(
    "second attachment file type",
    attachment2.file_type,
    "jpg",
  );

  // Step 10: Verify MIME types are correct for display
  TestValidator.equals(
    "first attachment MIME type for display",
    attachment1.mime_type,
    "image/png",
  );
  TestValidator.equals(
    "second attachment MIME type for display",
    attachment2.mime_type,
    "image/jpeg",
  );
}
