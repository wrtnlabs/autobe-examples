import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator capability to delete image attachments from any member's
 * article.
 *
 * This test validates the elevated privileges of moderators to perform content
 * moderation by removing inappropriate or policy-violating images from any
 * article regardless of authorship. The test ensures that moderators can
 * successfully soft-delete images (deleted_at timestamp set) while maintaining
 * audit trail integrity by preserving the database record.
 *
 * Workflow:
 *
 * 1. Create and authenticate member account
 * 2. Member creates an article for discussion
 * 3. Member uploads an image attachment to the article
 * 4. Create and authenticate moderator account (actor switching)
 * 5. Moderator deletes the member's image attachment (cross-actor moderation)
 * 6. Verify soft-delete operation and audit trail preservation
 */
export async function test_api_article_image_moderation_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Member creates an article
  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Member uploads image to the article
  const imageData = {
    original_filename: "test-image.png",
    file_size: 1024 * 500,
    content_type: "image/png",
    storage_url: "https://storage.example.com/images/test-image.png",
    width: 800,
    height: 600,
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

  // Validate uploaded image metadata
  TestValidator.equals(
    "image filename matches",
    uploadedImage.original_filename,
    imageData.original_filename,
  );
  TestValidator.equals(
    "image file size matches",
    uploadedImage.file_size,
    imageData.file_size,
  );
  TestValidator.equals(
    "image should not be deleted initially",
    uploadedImage.deleted_at,
    null,
  );

  // Step 4: Create and authenticate moderator account (actor switching)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator456!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/moderator/dashboard",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 5: Moderator deletes the member's image attachment
  const deletedImage =
    await api.functional.discussionBoard.moderator.articles.images.erase(
      connection,
      {
        articleId: article.id,
        imageId: uploadedImage.id,
      },
    );
  typia.assert(deletedImage);

  // Step 6: Validate soft-delete operation and audit trail preservation
  TestValidator.equals(
    "deleted image ID matches",
    deletedImage.id,
    uploadedImage.id,
  );
  TestValidator.equals(
    "deleted image article ID preserved",
    deletedImage.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "deleted image filename preserved",
    deletedImage.original_filename,
    imageData.original_filename,
  );
  TestValidator.equals(
    "deleted image file size preserved",
    deletedImage.file_size,
    imageData.file_size,
  );
  TestValidator.equals(
    "deleted image content type preserved",
    deletedImage.content_type,
    imageData.content_type,
  );
  TestValidator.equals(
    "deleted image storage URL preserved",
    deletedImage.storage_url,
    imageData.storage_url,
  );

  // Critical validation: deleted_at timestamp should be set (soft-delete)
  TestValidator.predicate(
    "deleted_at timestamp should be set after moderation deletion",
    deletedImage.deleted_at !== null && deletedImage.deleted_at !== undefined,
  );

  // Validate deleted_at is a valid ISO date-time string
  if (
    deletedImage.deleted_at !== null &&
    deletedImage.deleted_at !== undefined
  ) {
    const deletedAtDate = new Date(deletedImage.deleted_at);
    TestValidator.predicate(
      "deleted_at should be a valid date",
      !isNaN(deletedAtDate.getTime()),
    );

    // Validate deletion happened recently (within last minute)
    const now = new Date();
    const timeDiff = now.getTime() - deletedAtDate.getTime();
    TestValidator.predicate(
      "deletion timestamp should be recent",
      timeDiff >= 0 && timeDiff < 60000,
    );
  }
}
