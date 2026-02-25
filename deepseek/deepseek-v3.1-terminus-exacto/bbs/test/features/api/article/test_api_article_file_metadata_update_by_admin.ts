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

export async function test_api_article_file_metadata_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create parent article
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create file attachment
  const fileAttachment =
    await generate_random_discussion_board_admin_articles_images_create(
      adminConnection,
      {
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<number & tags.Type<"int32">>(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(fileAttachment);
  // 4. Update file metadata
  const updateData = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    caption: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardArticleFile.IUpdate;
  const updatedFile =
    await api.functional.discussionBoard.admin.articles.files.patchByArticleid(
      adminConnection,
      {
        articleId: article.id,
        body: updateData,
      },
    );
  typia.assert(updatedFile);
  // 5. Validate metadata updates
  TestValidator.equals(
    "display_order should match",
    updatedFile.display_order,
    updateData.display_order,
  );
  TestValidator.equals(
    "alt_text should match",
    updatedFile.alt_text,
    updateData.alt_text,
  );
  TestValidator.equals(
    "caption should match",
    updatedFile.caption,
    updateData.caption,
  );
  // 6. Verify file content remains unchanged
  TestValidator.equals(
    "attachment_file should remain unchanged",
    updatedFile.attachment_file.id,
    fileAttachment.attachment_file.id,
  );
  TestValidator.equals(
    "attachment_file filename should remain unchanged",
    updatedFile.attachment_file.filename,
    fileAttachment.attachment_file.filename,
  );
  TestValidator.equals(
    "attachment_file size should remain unchanged",
    updatedFile.attachment_file.file_size,
    fileAttachment.attachment_file.file_size,
  );
  // 7. Test optimistic locking - updated_at should change
  // FIX: Access updated_at through the attachment_file property instead of directly
  TestValidator.notEquals(
    "updated_at should change",
    updatedFile.attachment_file.updated_at,
    fileAttachment.attachment_file.updated_at,
  );
}