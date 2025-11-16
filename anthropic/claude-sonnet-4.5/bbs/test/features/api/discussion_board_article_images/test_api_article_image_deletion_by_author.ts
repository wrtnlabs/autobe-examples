import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the complete workflow of article image deletion by the author.
 *
 * This test validates the end-to-end process where a member creates an article,
 * uploads an image attachment to that article, and then successfully deletes
 * the image attachment. The test ensures:
 *
 * 1. Member authentication and account creation
 * 2. Article creation by the authenticated member
 * 3. Image upload to the created article
 * 4. Image deletion by the article author (soft deletion)
 * 5. Verification that deleted_at timestamp is set correctly
 *
 * The test validates the authorization model ensuring only the article author
 * can delete their own image attachments, and confirms the soft deletion
 * mechanism where the deleted_at timestamp is set while preserving the database
 * record for audit trail purposes.
 */
export async function test_api_article_image_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  // Step 2: Create a discussion board article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Step 3: Upload an image attachment to the article
  const imageData = {
    original_filename: `test-image-${RandomGenerator.alphaNumeric(8)}.png`,
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type: "image/png",
    storage_url: typia.random<string & tags.Format<"uri">>(),
    width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IDiscussionBoardArticleImage.ICreate;

  const uploadedImage: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: createdArticle.id,
        body: imageData,
      },
    );
  typia.assert(uploadedImage);

  // Verify the uploaded image has no deleted_at timestamp initially
  TestValidator.equals(
    "uploaded image should not be deleted initially",
    uploadedImage.deleted_at,
    null,
  );

  // Step 4: Delete the image attachment (soft deletion)
  const deletedImage: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.member.articles.images.erase(
      connection,
      {
        articleId: createdArticle.id,
        imageId: uploadedImage.id,
      },
    );
  typia.assert(deletedImage);

  // Step 5: Verify the soft deletion was successful
  TestValidator.predicate(
    "deleted image should have deleted_at timestamp set",
    deletedImage.deleted_at !== null && deletedImage.deleted_at !== undefined,
  );

  // Verify all other properties remain unchanged
  TestValidator.equals(
    "deleted image id should match uploaded image id",
    deletedImage.id,
    uploadedImage.id,
  );
  TestValidator.equals(
    "deleted image article id should remain unchanged",
    deletedImage.discussion_board_article_id,
    uploadedImage.discussion_board_article_id,
  );
  TestValidator.equals(
    "deleted image filename should remain unchanged",
    deletedImage.original_filename,
    uploadedImage.original_filename,
  );
  TestValidator.equals(
    "deleted image storage url should remain unchanged",
    deletedImage.storage_url,
    uploadedImage.storage_url,
  );
}
