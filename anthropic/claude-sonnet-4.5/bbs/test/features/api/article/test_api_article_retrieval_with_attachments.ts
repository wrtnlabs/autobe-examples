import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test retrieving an article that has both image and document attachments.
 *
 * This validates that the article retrieval operation correctly returns all
 * attachment metadata from discussion_board_article_images and
 * discussion_board_article_documents tables. The test creates an article,
 * uploads image and document attachments, then retrieves the article and
 * verifies that all attachment information is included (original filenames,
 * file sizes, MIME types, dimensions for images, etc.).
 *
 * Step-by-step process:
 *
 * 1. Create a member account to author the test article
 * 2. Create a category required for article creation
 * 3. Create a base article
 * 4. Upload image attachments to the article
 * 5. Upload document attachments to the article
 * 6. Retrieve the article and verify all attachment metadata is present
 */
export async function test_api_article_retrieval_with_attachments(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create a category (requires moderator, but using member context)
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create a base article without attachments first
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 4: Upload image attachments
  const imageCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
  >();
  const uploadedImages = await ArrayUtil.asyncRepeat(
    imageCount,
    async (index) => {
      const imageData = {
        url: typia.random<string & tags.Format<"uri">>(),
        original_name: `test_image_${index + 1}.png`,
        mime_type: RandomGenerator.pick([
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
        ] as const),
        size_bytes: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<1000> &
            tags.Maximum<5242880>
        >(),
        width: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<2000>
        >(),
        height: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<2000>
        >(),
      } satisfies IDiscussionBoardArticleImage.ICreate;

      const uploadedImage =
        await api.functional.discussionBoard.member.articles.images.create(
          connection,
          {
            articleId: article.id,
            body: imageData,
          },
        );
      typia.assert(uploadedImage);
      return uploadedImage;
    },
  );

  // Step 5: Upload document attachments
  const documentCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
  >();
  const uploadedDocuments = await ArrayUtil.asyncRepeat(
    documentCount,
    async (index) => {
      const documentData = {
        url: typia.random<string & tags.Format<"uri">>(),
        original_name: `research_paper_${index + 1}.pdf`,
        mime_type: RandomGenerator.pick([
          "application/pdf",
          "application/msword",
          "text/plain",
        ] as const),
        size_bytes: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<5000> &
            tags.Maximum<10485760>
        >(),
      } satisfies IDiscussionBoardArticleDocument.ICreate;

      const uploadedDocument =
        await api.functional.discussionBoard.member.articles.documents.create(
          connection,
          {
            articleId: article.id,
            body: documentData,
          },
        );
      typia.assert(uploadedDocument);
      return uploadedDocument;
    },
  );

  // Step 6: Retrieve the article and verify all attachments are present
  const retrievedArticle = await api.functional.discussionBoard.articles.at(
    connection,
    {
      articleId: article.id,
    },
  );
  typia.assert(retrievedArticle);

  // Verify article basic properties
  TestValidator.equals("article ID matches", retrievedArticle.id, article.id);
  TestValidator.equals(
    "article title matches",
    retrievedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article body matches",
    retrievedArticle.body,
    article.body,
  );

  // Verify image attachments are present and complete
  TestValidator.equals(
    "image count matches",
    retrievedArticle.images.length,
    uploadedImages.length,
  );

  for (const uploadedImage of uploadedImages) {
    const foundImage = retrievedArticle.images.find(
      (img) => img.id === uploadedImage.id,
    );

    if (foundImage) {
      typia.assertGuard(foundImage);

      TestValidator.equals(
        "image original name matches",
        foundImage.original_name,
        uploadedImage.original_name,
      );
      TestValidator.equals(
        "image mime type matches",
        foundImage.mime_type,
        uploadedImage.mime_type,
      );
      TestValidator.equals(
        "image size matches",
        foundImage.size_bytes,
        uploadedImage.size_bytes,
      );
      TestValidator.equals(
        "image width matches",
        foundImage.width,
        uploadedImage.width,
      );
      TestValidator.equals(
        "image height matches",
        foundImage.height,
        uploadedImage.height,
      );
      TestValidator.predicate("image URL is valid", foundImage.url.length > 0);
      TestValidator.predicate(
        "image has uploader info",
        foundImage.uploader.id === member.id,
      );
    }
  }

  // Verify document attachments are present and complete
  TestValidator.equals(
    "document count matches",
    retrievedArticle.documents.length,
    uploadedDocuments.length,
  );

  for (const uploadedDocument of uploadedDocuments) {
    const foundDocument = retrievedArticle.documents.find(
      (doc) => doc.id === uploadedDocument.id,
    );

    if (foundDocument) {
      typia.assertGuard(foundDocument);

      TestValidator.equals(
        "document original name matches",
        foundDocument.original_name,
        uploadedDocument.original_name,
      );
      TestValidator.equals(
        "document mime type matches",
        foundDocument.mime_type,
        uploadedDocument.mime_type,
      );
      TestValidator.equals(
        "document size matches",
        foundDocument.size_bytes,
        uploadedDocument.size_bytes,
      );

      if (foundDocument.uploader) {
        TestValidator.equals(
          "document uploader matches",
          foundDocument.uploader.id,
          member.id,
        );
      }
    }
  }
}
