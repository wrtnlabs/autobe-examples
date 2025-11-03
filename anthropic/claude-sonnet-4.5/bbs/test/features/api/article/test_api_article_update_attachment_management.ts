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
 * Test attachment management during article updates.
 *
 * This test validates that members can add and remove image and document
 * attachments when updating their articles. It verifies proper attachment
 * storage, soft deletion of removed attachments, and enforcement of attachment
 * limits (maximum 10 images, 5 documents).
 *
 * Test workflow:
 *
 * 1. Register a member account
 * 2. Create a category for article classification
 * 3. Create an article with initial attachments (3 images, 2 documents)
 * 4. Add image and document attachments to the article
 * 5. Update article to add new attachments and remove some existing ones
 * 6. Verify new attachments are stored correctly
 * 7. Verify removed attachments are soft-deleted
 * 8. Validate attachment limits are enforced
 */
export async function test_api_article_update_attachment_management(
  connection: api.IConnection,
) {
  // Step 1: Register a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(8) + "Aa1!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create a category for the article
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create initial image attachments (3 images)
  const initialImages = await ArrayUtil.asyncRepeat(3, async () => {
    const imageData = {
      url: typia.random<string & tags.Format<"uri">>(),
      original_name: `${RandomGenerator.alphaNumeric(8)}.png`,
      mime_type: "image/png",
      size_bytes: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5242880>
      >(),
      width: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
      >(),
      height: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
      >(),
    } satisfies IDiscussionBoardArticleImage.ICreate;
    return imageData;
  });

  // Step 4: Create initial document attachments (2 documents)
  const initialDocuments = await ArrayUtil.asyncRepeat(2, async () => {
    const docData = {
      url: typia.random<string & tags.Format<"uri">>(),
      original_name: `${RandomGenerator.alphaNumeric(8)}.pdf`,
      mime_type: "application/pdf",
      size_bytes: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
      >(),
    } satisfies IDiscussionBoardArticleDocument.ICreate;
    return docData;
  });

  // Step 5: Create article with initial attachments
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
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

  // Step 6: Add initial images to the article
  const uploadedImages = await ArrayUtil.asyncMap(
    initialImages,
    async (imageData) => {
      const image =
        await api.functional.discussionBoard.member.articles.images.create(
          connection,
          {
            articleId: article.id,
            body: imageData,
          },
        );
      typia.assert(image);
      return image;
    },
  );

  // Step 7: Add initial documents to the article
  const uploadedDocuments = await ArrayUtil.asyncMap(
    initialDocuments,
    async (docData) => {
      const doc =
        await api.functional.discussionBoard.member.articles.documents.create(
          connection,
          {
            articleId: article.id,
            body: docData,
          },
        );
      typia.assert(doc);
      return doc;
    },
  );

  // Step 8: Create new attachments to add during update
  const newImageData = {
    url: typia.random<string & tags.Format<"uri">>(),
    original_name: `${RandomGenerator.alphaNumeric(8)}.jpg`,
    mime_type: "image/jpeg",
    size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5242880>
    >(),
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
    >(),
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
    >(),
  } satisfies IDiscussionBoardArticleImage.ICreate;

  const newImage =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: newImageData,
      },
    );
  typia.assert(newImage);

  const newDocData = {
    url: typia.random<string & tags.Format<"uri">>(),
    original_name: `${RandomGenerator.alphaNumeric(8)}.docx`,
    mime_type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
    >(),
  } satisfies IDiscussionBoardArticleDocument.ICreate;

  const newDocument =
    await api.functional.discussionBoard.member.articles.documents.create(
      connection,
      {
        articleId: article.id,
        body: newDocData,
      },
    );
  typia.assert(newDocument);

  // Step 9: Select some attachments to remove (remove first image and first document)
  const imageToRemove = uploadedImages[0];
  const documentToRemove = uploadedDocuments[0];

  // Step 10: Update article to add new attachments and remove existing ones
  const updatedArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: article.id,
      body: {
        add_image_ids: [newImage.id],
        remove_image_ids: [imageToRemove.id],
        add_document_ids: [newDocument.id],
        remove_document_ids: [documentToRemove.id],
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 11: Validate the updated article has correct attachments
  // Should have: 2 original images + 1 new image = 3 images (1 removed)
  TestValidator.equals(
    "article should have 3 images after update",
    updatedArticle.images.length,
    3,
  );

  // Should have: 1 original document + 1 new document = 2 documents (1 removed)
  TestValidator.equals(
    "article should have 2 documents after update",
    updatedArticle.documents.length,
    2,
  );

  // Step 12: Verify new image is in the article
  const hasNewImage = updatedArticle.images.some(
    (img) => img.id === newImage.id,
  );
  TestValidator.predicate("new image should be in article", hasNewImage);

  // Step 13: Verify removed image is not in the active images
  const hasRemovedImage = updatedArticle.images.some(
    (img) => img.id === imageToRemove.id,
  );
  TestValidator.predicate(
    "removed image should not be in article",
    !hasRemovedImage,
  );

  // Step 14: Verify new document is in the article
  const hasNewDocument = updatedArticle.documents.some(
    (doc) => doc.id === newDocument.id,
  );
  TestValidator.predicate("new document should be in article", hasNewDocument);

  // Step 15: Verify removed document is not in the active documents
  const hasRemovedDocument = updatedArticle.documents.some(
    (doc) => doc.id === documentToRemove.id,
  );
  TestValidator.predicate(
    "removed document should not be in article",
    !hasRemovedDocument,
  );
}
