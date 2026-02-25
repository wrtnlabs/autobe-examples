import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_images_create } from "../../../generate/generate_random_discussion_board_user_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

/**
 * Test the successful update of article image metadata including display order, alt text, and caption.
 * 1. Authenticate a user
 * 2. Create an article (using available APIs)
 * 3. Attach an image to the article (using available APIs)
 * 4. Update the image metadata
 * 5. Validate that only specified fields are updated while others remain unchanged
 */
export async function test_api_article_image_metadata_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userAuth);
  // Create user-specific connection with authorization token
  const authorizedUserConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${userAuth.token.access}` },
  };
  // 2. Create an article - use SDK directly since we need valid section ID
  // For this test, we'll assume a section exists or create one if possible
  const articleBody: IDiscussionBoardArticle.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({ paragraphs: 1 }),
    discussion_board_section_id: typia.random<string & tags.Format<"uuid">>(),
  };
  const article = await api.functional.discussionBoard.user.articles.create(
    authorizedUserConnection,
    { body: articleBody },
  );
  typia.assert(article);
  // 3. Attach an image to the article - use SDK directly
  const imageBody: IDiscussionBoardArticleFile.ICreate = {
    attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    caption: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const originalImage =
    await api.functional.discussionBoard.user.articles.images.create(
      authorizedUserConnection,
      {
        articleId: article.id,
        body: imageBody,
      },
    );
  typia.assert(originalImage);
  // Store original values for comparison
  const originalDisplayOrder = originalImage.display_order;
  const originalAltText = originalImage.alt_text;
  const originalCaption = originalImage.caption;
  // 4. Update the image metadata with new values
  const updateBody: IDiscussionBoardArticleFile.IUpdate = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    caption: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const updatedImage =
    await api.functional.discussionBoard.user.articles.images.update(
      authorizedUserConnection,
      {
        articleId: article.id,
        imageId: originalImage.id,
        body: updateBody,
      },
    );
  typia.assert(updatedImage);
  // 5. Validate that only the specified fields are updated while others remain unchanged
  TestValidator.equals(
    "display order updated",
    updatedImage.display_order,
    updateBody.display_order,
  );
  TestValidator.equals(
    "alt text updated",
    updatedImage.alt_text,
    updateBody.alt_text,
  );
  TestValidator.equals(
    "caption updated",
    updatedImage.caption,
    updateBody.caption,
  );
  // Verify unchanged fields
  TestValidator.equals("id remains same", updatedImage.id, originalImage.id);
  TestValidator.equals(
    "status remains same",
    updatedImage.status,
    originalImage.status,
  );
  TestValidator.equals(
    "attachment file remains same",
    updatedImage.attachment_file.id,
    originalImage.attachment_file.id,
  );
  TestValidator.equals(
    "article reference remains same",
    updatedImage.article.id,
    originalImage.article.id,
  );
  // 6. Validate that the updated image record is returned with all current values
  TestValidator.predicate("updated image has valid structure", () => {
    return (
      updatedImage.id !== undefined &&
      updatedImage.display_order !== undefined &&
      updatedImage.attachment_file !== undefined &&
      updatedImage.article !== undefined
    );
  });
}
