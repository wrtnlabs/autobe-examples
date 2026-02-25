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

export async function test_api_article_file_update_metadata_success(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Join as administrator
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create article
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: typia.random<string & tags.MinLength<5> & tags.MaxLength<200>>(),
        content: typia.random<string & tags.MinLength<50>>(),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create file attachment
  const initialFile =
    await generate_random_discussion_board_admin_articles_images_create(
      adminConnection,
      {
        params: { articleId: article.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<number & tags.Type<"int32">>(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(initialFile);
  // Update file metadata
  const updateData = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    caption: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardArticleFile.IUpdate;
  const updatedFile =
    await api.functional.discussionBoard.admin.articles.files.putByArticleidAndFileid(
      adminConnection,
      {
        articleId: article.id,
        fileId: initialFile.id,
        body: updateData,
      },
    );
  typia.assert(updatedFile);
  // Validate that allowed metadata fields were updated
  TestValidator.equals(
    "display order updated",
    updatedFile.display_order,
    updateData.display_order,
  );
  TestValidator.equals(
    "alt text updated",
    updatedFile.alt_text,
    updateData.alt_text,
  );
  TestValidator.equals(
    "caption updated",
    updatedFile.caption,
    updateData.caption,
  );
  // Validate that technical file properties remain unchanged
  TestValidator.equals("file ID unchanged", updatedFile.id, initialFile.id);
  TestValidator.equals(
    "file size unchanged",
    updatedFile.attachment_file.file_size,
    initialFile.attachment_file.file_size,
  );
  TestValidator.equals(
    "MIME type unchanged",
    updatedFile.attachment_file.mime_type,
    initialFile.attachment_file.mime_type,
  );
  TestValidator.equals(
    "filename unchanged",
    updatedFile.attachment_file.filename,
    initialFile.attachment_file.filename,
  );
  TestValidator.equals(
    "article reference unchanged",
    updatedFile.article.id,
    initialFile.article.id,
  );
}
