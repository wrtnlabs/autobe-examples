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

export async function test_api_superadmin_article_file_metadata_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Note: Since we don't have APIs for article/file creation in the available functions,
  // we'll simulate the scenario using valid UUIDs that would represent existing resources
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const fileId = typia.random<string & tags.Format<"uuid">>();
  // Define the update metadata
  const updateBody = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    caption: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardArticleFile.IUpdate;
  // Update the file metadata
  const updatedFile =
    await api.functional.discussionBoard.superAdmin.articles.files.putByArticleidAndFileid(
      superAdminConnection,
      {
        articleId,
        fileId,
        body: updateBody,
      },
    );
  typia.assert(updatedFile);
  // Validate updated metadata matches the request
  TestValidator.equals(
    "display_order should match",
    updatedFile.display_order,
    updateBody.display_order,
  );
  TestValidator.equals(
    "alt_text should match",
    updatedFile.alt_text,
    updateBody.alt_text,
  );
  TestValidator.equals(
    "caption should match",
    updatedFile.caption,
    updateBody.caption,
  );
  // Validate technical properties are preserved
  TestValidator.predicate(
    "file size should be positive",
    updatedFile.attachment_file.file_size > 0,
  );
  TestValidator.notEquals(
    "MIME type should not be empty",
    updatedFile.attachment_file.mime_type,
    "",
  );
  TestValidator.notEquals(
    "storage path should not be empty",
    updatedFile.attachment_file.storage_path,
    "",
  );
  // Validate file belongs to the correct article
  TestValidator.equals(
    "file should belong to correct article",
    updatedFile.article.id,
    articleId,
  );
  // Validate attachment file properties are consistent
  TestValidator.equals(
    "attachment file ID should match",
    updatedFile.attachment_file.id,
    fileId,
  );
  TestValidator.predicate(
    "attachment file has valid creation date",
    updatedFile.attachment_file.created_at.length > 0,
  );
  TestValidator.predicate(
    "attachment file has valid update date",
    updatedFile.attachment_file.updated_at.length > 0,
  );
}
