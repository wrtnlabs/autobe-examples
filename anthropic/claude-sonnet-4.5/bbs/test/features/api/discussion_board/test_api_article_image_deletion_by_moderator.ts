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
 * Test the complete workflow of a moderator deleting an image attachment from a
 * member's article.
 *
 * This test validates that moderators have elevated privileges to manage
 * content across the platform, specifically the ability to delete image
 * attachments from any article regardless of ownership. The workflow
 * demonstrates proper authorization mechanics where moderators can perform
 * content management operations on member-created content.
 *
 * Workflow steps:
 *
 * 1. Register and authenticate a member account
 * 2. Register and authenticate a moderator account
 * 3. Moderator creates a category for article classification
 * 4. Member creates an article (using member auth token)
 * 5. Member uploads an image attachment to their article
 * 6. Moderator deletes the image from the member's article (using moderator auth
 *    token)
 * 7. Verify successful deletion through void return without errors
 *
 * The test confirms moderator intervention capabilities for content management,
 * enabling platform moderation and content control across all user-generated
 * content.
 */
export async function test_api_article_image_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Store member authentication token for later use
  const memberToken = member.token.access;

  // Step 2: Register and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorUsername = RandomGenerator.alphaNumeric(10);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Moderator creates category for article classification
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

  // Step 4: Switch to member context and create article
  const memberConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: memberToken },
  };

  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 1 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Member uploads image attachment to their article
  const imageUrl = typia.random<string & tags.Format<"uri">>();
  const imageOriginalName = `${RandomGenerator.alphaNumeric(8)}.png`;
  const imageMimeType = "image/png";
  const imageSizeBytes = 1024000;
  const imageWidth = 800;
  const imageHeight = 600;

  const uploadedImage =
    await api.functional.discussionBoard.member.articles.images.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          url: imageUrl,
          original_name: imageOriginalName,
          mime_type: imageMimeType,
          size_bytes: imageSizeBytes,
          width: imageWidth,
          height: imageHeight,
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(uploadedImage);

  // Step 6: Moderator deletes the image from the member's article
  // Connection already has moderator token from step 2
  await api.functional.discussionBoard.moderator.articles.images.erase(
    connection,
    {
      articleId: article.id,
      imageId: uploadedImage.id,
    },
  );

  // Successful void return indicates the deletion completed without errors
  // This confirms moderators can delete images from any article regardless of ownership
}
