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

export async function test_api_file_download_success_authorized_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate super admin
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Create article
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Create file attachment for the article
  const fileAttachment =
    await generate_random_discussion_board_super_admin_articles_images_create(
      superAdminConnection,
      {
        params: { articleId: article.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(fileAttachment);
  // Download the file
  const downloadedFile =
    await api.functional.discussionBoard.superAdmin.articles.files.at(
      superAdminConnection,
      {
        articleId: article.id,
        fileId: fileAttachment.id,
      },
    );
  typia.assert(downloadedFile);
  // Validate file metadata
  TestValidator.equals("file ID matches", downloadedFile.id, fileAttachment.id);
  TestValidator.equals(
    "attachment file ID matches",
    downloadedFile.attachment_file.id,
    fileAttachment.attachment_file.id,
  );
  TestValidator.predicate(
    "valid filename",
    downloadedFile.attachment_file.filename.length > 0,
  );
  TestValidator.predicate(
    "positive file size",
    downloadedFile.attachment_file.file_size >= 0,
  );
  TestValidator.predicate(
    "valid MIME type",
    downloadedFile.attachment_file.mime_type.length > 0,
  );
  TestValidator.predicate(
    "valid storage path",
    downloadedFile.attachment_file.storage_path.length > 0,
  );
  TestValidator.predicate(
    "created timestamp exists",
    downloadedFile.attachment_file.created_at.length > 0,
  );
  // Validate article references
  TestValidator.equals(
    "article ID matches reference",
    downloadedFile.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title matches",
    downloadedFile.article.title,
    article.title,
  );
  TestValidator.equals(
    "article author matches",
    downloadedFile.article.author.id,
    article.author.id,
  );
  // Validate attachment file details
  TestValidator.predicate(
    "filename is not null",
    downloadedFile.attachment_file.filename !== null,
  );
  TestValidator.predicate(
    "file size is integer",
    Number.isInteger(downloadedFile.attachment_file.file_size),
  );
  TestValidator.predicate(
    "MIME type is not empty",
    downloadedFile.attachment_file.mime_type.trim().length > 0,
  );
  TestValidator.predicate(
    "storage path starts with slash or contains valid chars",
    /^[\/\w\-\.]+$/.test(downloadedFile.attachment_file.storage_path),
  );
  // Validate status and display order
  TestValidator.predicate("status is valid", downloadedFile.status.length > 0);
  TestValidator.predicate(
    "display order is non-negative",
    downloadedFile.display_order >= 0,
  );
  TestValidator.equals(
    "display order matches input",
    downloadedFile.display_order,
    fileAttachment.display_order,
  );
}
