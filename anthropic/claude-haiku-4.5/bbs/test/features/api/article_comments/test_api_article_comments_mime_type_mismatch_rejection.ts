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
 * Test MIME type validation against file extension.
 *
 * This test validates that comment attachments properly enforce MIME type
 * validation to prevent format spoofing attacks. It tests both rejection of
 * mismatched MIME types and acceptance of correctly matched types.
 *
 * Test workflow:
 *
 * 1. Register and authenticate a contributor
 * 2. Create an article for testing comments
 * 3. Test comment creation without attachments (basic flow)
 * 4. Attempt to post a comment with mismatched file extension and MIME type
 * 5. Verify the API rejects the mismatch to prevent security issues
 * 6. Test that correctly matched MIME types are accepted
 */
export async function test_api_article_comments_mime_type_mismatch_rejection(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a contributor
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: "TestPassword123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // 2. Create an article for testing comments
  // Note: Using a random categoryId as the test assumes a category exists
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/article/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3. Test comment creation without attachments (basic flow validation)
  const basicComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(basicComment);
  TestValidator.predicate(
    "basic comment without attachments should be created successfully",
    basicComment.id !== undefined,
  );

  // 4. Test rejection of mismatched MIME type and file extension
  // Create an attachment with JPG file_type but PNG MIME type - should be rejected
  await TestValidator.error(
    "should reject comment with mismatched MIME type (jpg extension but png mime type)",
    async () => {
      await api.functional.discussionBoard.contributor.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 5 }),
            attachments: [
              {
                original_file_name: "test_image.jpg",
                file_type: "jpg",
                file_size: typia.random<
                  number &
                    tags.Type<"int32"> &
                    tags.Minimum<1> &
                    tags.Maximum<5242880>
                >(),
                mime_type: "image/png",
                display_url: typia.random<string & tags.Format<"uri">>(),
              } satisfies IDiscussionBoardCommentAttachment.ICreate,
            ],
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );

  // 5. Test rejection of PNG extension with JPEG MIME type
  await TestValidator.error(
    "should reject comment with png extension but jpeg mime type",
    async () => {
      await api.functional.discussionBoard.contributor.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 5 }),
            attachments: [
              {
                original_file_name: "test_image.png",
                file_type: "png",
                file_size: typia.random<
                  number &
                    tags.Type<"int32"> &
                    tags.Minimum<1> &
                    tags.Maximum<5242880>
                >(),
                mime_type: "image/jpeg",
                display_url: typia.random<string & tags.Format<"uri">>(),
              } satisfies IDiscussionBoardCommentAttachment.ICreate,
            ],
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );

  // 6. Test acceptance of correctly matched MIME types
  // JPG with image/jpeg MIME type
  const validCommentJpg =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
          attachments: [
            {
              original_file_name: "valid_image.jpg",
              file_type: "jpg",
              file_size: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<1> &
                  tags.Maximum<5242880>
              >(),
              mime_type: "image/jpeg",
              display_url: typia.random<string & tags.Format<"uri">>(),
            } satisfies IDiscussionBoardCommentAttachment.ICreate,
          ],
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(validCommentJpg);
  TestValidator.predicate(
    "comment with correct JPG MIME type should be created successfully",
    validCommentJpg.id !== undefined,
  );

  // 7. Test PNG with correct MIME type
  const validCommentPng =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
          attachments: [
            {
              original_file_name: "valid_image.png",
              file_type: "png",
              file_size: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<1> &
                  tags.Maximum<5242880>
              >(),
              mime_type: "image/png",
              display_url: typia.random<string & tags.Format<"uri">>(),
            } satisfies IDiscussionBoardCommentAttachment.ICreate,
          ],
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(validCommentPng);
  TestValidator.predicate(
    "comment with correct PNG MIME type should be created successfully",
    validCommentPng.id !== undefined,
  );

  // 8. Test GIF with correct MIME type
  const validCommentGif =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
          attachments: [
            {
              original_file_name: "valid_animation.gif",
              file_type: "gif",
              file_size: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<1> &
                  tags.Maximum<5242880>
              >(),
              mime_type: "image/gif",
              display_url: typia.random<string & tags.Format<"uri">>(),
            } satisfies IDiscussionBoardCommentAttachment.ICreate,
          ],
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(validCommentGif);
  TestValidator.predicate(
    "comment with correct GIF MIME type should be created successfully",
    validCommentGif.id !== undefined,
  );
}
