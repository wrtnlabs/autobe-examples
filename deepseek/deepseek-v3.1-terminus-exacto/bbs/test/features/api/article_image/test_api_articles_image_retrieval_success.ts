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

export async function test_api_articles_image_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authorize super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, { body: undefined });
  // We'll need to create an image attachment file ID for step 3.
  // Let's assume we can generate a random UUID for that purpose.
  // In real scenario, we'd call the file upload API first, but we don't have that utility.
  // Instead we use typia.random to generate a valid UUID for attachment_file_id.
  // 2. Create article as super admin
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      { body: undefined },
    );
  typia.assert(article);
  // 3. Upload image to the article using generation utility.
  // The utility expects an attachment_file_id, which we will generate randomly.
  // This matches the scenario's dependency: POST /discussionBoard/superAdmin/articles/{articleId}/images
  const createImageBody: IDiscussionBoardArticleFile.ICreate = {
    attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    caption: RandomGenerator.paragraph({ sentences: 1 }),
  };
  const createdImage =
    await generate_random_discussion_board_super_admin_articles_images_create(
      superAdminConnection,
      {
        body: createImageBody,
        params: { articleId: article.id },
      },
    );
  typia.assert(createdImage);
  // 4. Retrieve the specific image via GET endpoint
  const retrievedImage =
    await api.functional.discussionBoard.superAdmin.articles.images.at(
      superAdminConnection,
      {
        articleId: article.id,
        imageId: createdImage.id,
      },
    );
  typia.assert(retrievedImage);
  // 5. Validate complete metadata
  TestValidator.equals("image ID matches", retrievedImage.id, createdImage.id);
  TestValidator.equals(
    "attachment file ID matches",
    retrievedImage.attachment_file.id,
    createImageBody.attachment_file_id,
  );
  TestValidator.predicate(
    "attachment file has filename",
    retrievedImage.attachment_file.filename.length > 0,
  );
  TestValidator.predicate(
    "attachment file has size",
    retrievedImage.attachment_file.file_size >= 0,
  );
  TestValidator.predicate(
    "attachment file has mime type",
    retrievedImage.attachment_file.mime_type.length > 0,
  );
  TestValidator.equals(
    "status present",
    retrievedImage.status,
    createdImage.status,
  );
  TestValidator.equals(
    "display order matches",
    retrievedImage.display_order,
    createImageBody.display_order,
  );
  TestValidator.equals(
    "article reference ID matches",
    retrievedImage.article.id,
    article.id,
  );
  if (createImageBody.alt_text) {
    TestValidator.equals(
      "alt text matches",
      retrievedImage.alt_text,
      createImageBody.alt_text,
    );
  }
  if (createImageBody.caption) {
    TestValidator.equals(
      "caption matches",
      retrievedImage.caption,
      createImageBody.caption,
    );
  }
}
