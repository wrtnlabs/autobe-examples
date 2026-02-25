import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_admin_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_article_image_metadata_update_successful_modification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup with utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Create article with utility function
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {},
  );
  typia.assert(article);
  // 3. Create image attachment with utility function
  const image =
    await generate_random_discussion_board_admin_articles_images_create(
      adminConnection,
      {
        params: { articleId: article.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: 1 satisfies number as number,
          alt_text: "Original alt text",
          caption: "Original caption",
        },
      },
    );
  typia.assert(image);
  // 4. Update image metadata
  const updateData = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >() satisfies number as number,
    alt_text: "Updated alt text for accessibility",
    caption: "Updated caption with more details",
  } satisfies api.functional.discussionBoard.admin.articles.images.update.Body;
  const updated =
    await api.functional.discussionBoard.admin.articles.images.update(
      adminConnection,
      {
        articleId: article.id,
        imageId: image.id,
        body: updateData,
      },
    );
  typia.assert(updated);
  // 5. Validate all fields updated correctly
  TestValidator.equals(
    "display order updated",
    updated.display_order,
    updateData.display_order,
  );
  TestValidator.equals(
    "alt text updated",
    updated.alt_text,
    updateData.alt_text,
  );
  TestValidator.equals("caption updated", updated.caption, updateData.caption);
  TestValidator.notEquals(
    "updated image differs from original",
    updated.display_order,
    image.display_order,
  );
  TestValidator.notEquals("alt text changed", updated.alt_text, image.alt_text);
  TestValidator.notEquals("caption changed", updated.caption, image.caption);
  TestValidator.equals(
    "article reference unchanged",
    updated.article.id,
    image.article.id,
  );
  TestValidator.equals(
    "attachment file unchanged",
    updated.attachment_file.id,
    image.attachment_file.id,
  );
}
