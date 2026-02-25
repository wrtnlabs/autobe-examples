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

export async function test_api_superadmin_article_image_attachment_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create article for testing
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {},
    );
  typia.assert(article);
  // 3. Create first image attachment
  const firstImage =
    await generate_random_discussion_board_super_admin_articles_images_create(
      superAdminConnection,
      {
        params: { articleId: article.id },
        body: {
          display_order: 1,
          alt_text: "First image description",
          caption: "First image caption",
        },
      },
    );
  typia.assert(firstImage);
  // Validate first image properties
  TestValidator.equals("first image status", firstImage.status, "uploaded");
  TestValidator.equals(
    "first image display order",
    firstImage.display_order,
    1,
  );
  TestValidator.equals(
    "first image alt text",
    firstImage.alt_text,
    "First image description",
  );
  TestValidator.equals(
    "first image caption",
    firstImage.caption,
    "First image caption",
  );
  TestValidator.predicate(
    "first image has attachment",
    () => firstImage.attachment_file !== undefined,
  );
  TestValidator.predicate(
    "first image has article reference",
    () => firstImage.article !== undefined,
  );
  // 4. Create second image attachment
  const secondImage =
    await generate_random_discussion_board_super_admin_articles_images_create(
      superAdminConnection,
      {
        params: { articleId: article.id },
        body: {
          display_order: 2,
          alt_text: "Second image description",
          caption: "Second image caption",
        },
      },
    );
  typia.assert(secondImage);
  // Validate second image properties
  TestValidator.equals("second image status", secondImage.status, "uploaded");
  TestValidator.equals(
    "second image display order",
    secondImage.display_order,
    2,
  );
  TestValidator.equals(
    "second image alt text",
    secondImage.alt_text,
    "Second image description",
  );
  TestValidator.equals(
    "second image caption",
    secondImage.caption,
    "Second image caption",
  );
  TestValidator.predicate(
    "second image has attachment",
    () => secondImage.attachment_file !== undefined,
  );
  TestValidator.predicate(
    "second image has article reference",
    () => secondImage.article !== undefined,
  );
  // 5. Verify both images reference the same article
  TestValidator.equals(
    "first image article ID",
    firstImage.article.id,
    article.id,
  );
  TestValidator.equals(
    "second image article ID",
    secondImage.article.id,
    article.id,
  );
  // 6. Verify attachment_file has required properties
  typia.assert(firstImage.attachment_file);
  typia.assert(secondImage.attachment_file);
  TestValidator.predicate(
    "first attachment has filename",
    () => firstImage.attachment_file.filename.length > 0,
  );
  TestValidator.predicate(
    "second attachment has filename",
    () => secondImage.attachment_file.filename.length > 0,
  );
  TestValidator.predicate(
    "first attachment has mime_type",
    () => firstImage.attachment_file.mime_type.length > 0,
  );
  TestValidator.predicate(
    "second attachment has mime_type",
    () => secondImage.attachment_file.mime_type.length > 0,
  );
}
