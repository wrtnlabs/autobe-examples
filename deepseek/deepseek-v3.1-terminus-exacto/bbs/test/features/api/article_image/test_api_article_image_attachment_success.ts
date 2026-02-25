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
 * Test successful image attachment to a user-owned article.
 * Create a new user account through registration, then create an article owned by that user.
 * Verify the article creation response includes valid article ID.
 * Call the image attachment endpoint with valid attachment file ID and display order.
 * Validate that the response includes proper image metadata including status 'uploaded',
 * correct display order positioning, and proper file attachment reference.
 * Verify the attachment file ID references a valid image file in the system.
 */
export async function test_api_article_image_attachment_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user-specific connection and register user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Create article owned by the user
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  TestValidator.predicate("article has valid ID", article.id.length > 0);
  // 3. Create image attachment for the article
  const inputDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const inputAttachmentFileId = typia.random<string & tags.Format<"uuid">>();
  const imageAttachment =
    await generate_random_discussion_board_user_articles_images_create(
      userConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          attachment_file_id: inputAttachmentFileId,
          display_order: inputDisplayOrder,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(imageAttachment);
  // 4. Validate image attachment response
  TestValidator.equals(
    "status should be uploaded",
    imageAttachment.status,
    "uploaded",
  );
  TestValidator.equals(
    "display order matches input",
    imageAttachment.display_order,
    inputDisplayOrder,
  );
  TestValidator.predicate(
    "has attachment file reference",
    imageAttachment.attachment_file !== undefined,
  );
  TestValidator.predicate(
    "attachment file has valid ID",
    imageAttachment.attachment_file.id.length > 0,
  );
  TestValidator.equals(
    "attachment file ID matches input",
    imageAttachment.attachment_file.id,
    inputAttachmentFileId,
  );
  // 5. Validate file metadata for image
  TestValidator.predicate(
    "file has valid filename",
    imageAttachment.attachment_file.filename.length > 0,
  );
  TestValidator.predicate(
    "file has positive size",
    imageAttachment.attachment_file.file_size > 0,
  );
  TestValidator.predicate(
    "has valid mime type",
    imageAttachment.attachment_file.mime_type.length > 0,
  );
  // 6. Validate image-specific metadata
  TestValidator.predicate(
    "image has width dimension",
    imageAttachment.attachment_file.width !== null &&
      imageAttachment.attachment_file.width !== undefined,
  );
  TestValidator.predicate(
    "image has height dimension",
    imageAttachment.attachment_file.height !== null &&
      imageAttachment.attachment_file.height !== undefined,
  );
  // 7. Validate article reference in the attachment
  TestValidator.equals(
    "article ID matches",
    imageAttachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title matches",
    imageAttachment.article.title,
    article.title,
  );
}
