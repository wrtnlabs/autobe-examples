import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_create";
import { generate_random_discussion_board_super_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_article_image_accessibility_metadata_enhancement(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create parent article
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Create initial image attachment with minimal metadata
  const initialImage =
    await generate_random_discussion_board_super_admin_articles_images_create(
      superAdminConnection,
      {
        params: { articleId: article.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          alt_text: null,
          caption: null,
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(initialImage);
  // Verify initial image has no accessibility metadata
  TestValidator.equals(
    "initial alt_text should be null",
    initialImage.alt_text,
    null,
  );
  TestValidator.equals(
    "initial caption should be null",
    initialImage.caption,
    null,
  );
  // Update image with comprehensive accessibility metadata
  const accessibilityMetadata = {
    display_order: initialImage.display_order satisfies number as number & tags.Type<"int32"> & tags.Minimum<0>,
    alt_text:
      "A person using a screen reader to browse website content with descriptive images",
    caption:
      "Image shows accessibility technology in use: screen reader software displaying text-to-speech output while user navigates through web content with keyboard controls.",
  } satisfies IDiscussionBoardArticleFile.IUpdate;
  const updatedImage =
    await api.functional.discussionBoard.superAdmin.articles.images.update(
      superAdminConnection,
      {
        articleId: article.id,
        imageId: initialImage.id,
        body: accessibilityMetadata,
      },
    );
  typia.assert(updatedImage);
  // Verify accessibility metadata was properly updated
  TestValidator.equals(
    "updated alt_text should match input",
    updatedImage.alt_text,
    accessibilityMetadata.alt_text,
  );
  TestValidator.equals(
    "updated caption should match input",
    updatedImage.caption,
    accessibilityMetadata.caption,
  );
  TestValidator.equals(
    "display_order should be preserved",
    updatedImage.display_order,
    accessibilityMetadata.display_order,
  );
  // Test edge case: maximum length alt text
  const maxAltText = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 15,
  });
  const maxLengthUpdate = {
    display_order: updatedImage.display_order satisfies number as number & tags.Type<"int32"> & tags.Minimum<0>,
    alt_text: maxAltText,
    caption: "Testing maximum length handling",
  } satisfies IDiscussionBoardArticleFile.IUpdate;
  const maxLengthImage =
    await api.functional.discussionBoard.superAdmin.articles.images.update(
      superAdminConnection,
      {
        articleId: article.id,
        imageId: updatedImage.id,
        body: maxLengthUpdate,
      },
    );
  typia.assert(maxLengthImage);
  TestValidator.equals(
    "maximum length alt_text should be accepted",
    maxLengthImage.alt_text,
    maxAltText,
  );
  // Test removal of accessibility metadata (setting to null)
  const removalUpdate = {
    display_order: maxLengthImage.display_order satisfies number as number & tags.Type<"int32"> & tags.Minimum<0>,
    alt_text: null,
    caption: null,
  } satisfies IDiscussionBoardArticleFile.IUpdate;
  const removedMetadataImage =
    await api.functional.discussionBoard.superAdmin.articles.images.update(
      superAdminConnection,
      {
        articleId: article.id,
        imageId: maxLengthImage.id,
        body: removalUpdate,
      },
    );
  typia.assert(removedMetadataImage);
  TestValidator.equals(
    "removed alt_text should be null",
    removedMetadataImage.alt_text,
    null,
  );
  TestValidator.equals(
    "removed caption should be null",
    removedMetadataImage.caption,
    null,
  );
  // Verify core image properties remain unchanged throughout updates
  TestValidator.equals(
    "image ID should remain constant",
    removedMetadataImage.id,
    initialImage.id,
  );
  TestValidator.equals(
    "attachment file should remain constant",
    removedMetadataImage.attachment_file.id,
    initialImage.attachment_file.id,
  );
  TestValidator.equals(
    "article reference should remain constant",
    removedMetadataImage.article.id,
    article.id,
  );
}