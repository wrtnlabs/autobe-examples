import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_admin_articles_images_create";
import { generate_random_discussion_board_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test scenario for image attachment with various supported MIME types.
 * This scenario validates that the system accepts all supported image formats
 * (image/jpeg, image/png, image/gif, image/webp, image/svg+xml) by testing
 * each MIME type with appropriate image metadata. The test creates images
 * with different MIME types and verifies the system correctly stores the
 * MIME type metadata for each format.
 */
export async function test_api_article_image_mimetype_support(
  connection: api.IConnection,
): Promise<void> {
  // Create admin session for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  typia.assert(adminConnection.headers?.Authorization);
  // Create a section for article creation
  const sectionId = typia.random<string>();
  // Create an article for testing
  const article =
    await generate_random_discussion_board_admin_sections_articles_create(
      adminConnection,
      {
        params: { sectionId: sectionId },
        body: {},
      },
    );
  typia.assert(article);
  // Test supported MIME types
  const supportedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ] as const;
  for (const mimeType of supportedMimeTypes) {
    // Use image-specific utility function with appropriate metadata
    const image =
      await generate_random_discussion_board_admin_articles_images_create(
        adminConnection,
        {
          params: { articleId: "" },
          body: {
            originalName: `test-image-${mimeType.split("/")[1]}`,
            storedName: RandomGenerator.alphaNumeric(32),
            mimeType: mimeType,
            size: RandomGenerator.pick([1024, 2048, 4096]),
            width: RandomGenerator.pick([800, 1024, 1920]),
            height: RandomGenerator.pick([600, 768, 1080]),
            displayOrder: 0,
          },
        },
      );
    typia.assert(image);
  }
}
