import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test retrieving image attachments where width and height dimensions are null.
 *
 * This scenario validates that the system correctly handles images where
 * dimension information could not be determined during upload. Creates an
 * article as a member, uploads an image attachment with null width and height
 * values (simulating cases where dimensions are unavailable), then retrieves
 * the image details. Verifies that the response correctly includes null values
 * for width and height fields while all other required metadata (id,
 * original_filename, file_size, content_type, storage_url, created_at) are
 * properly populated.
 */
export async function test_api_article_image_nullable_dimensions(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create an article to hold the image attachment
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Upload an image with null width and height (simulating missing dimension info)
  const imageData = {
    original_filename: `${RandomGenerator.name(1)}.png`,
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
    >(),
    content_type: "image/png",
    storage_url: typia.random<string & tags.Format<"uri">>(),
    width: null,
    height: null,
  } satisfies IDiscussionBoardArticleImage.ICreate;

  const uploadedImage: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: imageData,
      },
    );
  typia.assert(uploadedImage);

  // Step 4: Retrieve the image details to verify null dimensions are handled correctly
  const retrievedImage: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.articles.images.at(connection, {
      articleId: article.id,
      imageId: uploadedImage.id,
    });
  typia.assert(retrievedImage);

  // Step 5: Validate that all required metadata is properly populated
  TestValidator.equals("image ID matches", retrievedImage.id, uploadedImage.id);
  TestValidator.equals(
    "article ID matches",
    retrievedImage.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "original filename matches",
    retrievedImage.original_filename,
    imageData.original_filename,
  );
  TestValidator.equals(
    "file size matches",
    retrievedImage.file_size,
    imageData.file_size,
  );
  TestValidator.equals(
    "content type matches",
    retrievedImage.content_type,
    imageData.content_type,
  );
  TestValidator.equals(
    "storage URL matches",
    retrievedImage.storage_url,
    imageData.storage_url,
  );

  // Step 6: Verify that width and height are null (critical validation)
  TestValidator.equals("width is null", retrievedImage.width, null);
  TestValidator.equals("height is null", retrievedImage.height, null);

  // Step 7: Verify timestamp fields are populated
  TestValidator.predicate(
    "created_at is populated",
    retrievedImage.created_at !== null &&
      retrievedImage.created_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is null for active image",
    retrievedImage.deleted_at === null ||
      retrievedImage.deleted_at === undefined,
  );
}
