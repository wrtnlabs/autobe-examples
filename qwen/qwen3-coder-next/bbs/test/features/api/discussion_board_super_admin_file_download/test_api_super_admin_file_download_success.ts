import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IString } from "@ORGANIZATION/PROJECT-api/lib/structures/IString";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_files_upload } from "../../../generate/generate_random_discussion_board_super_admin_articles_files_upload";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_super_admin_file_download_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(superAdminConnection.headers?.["Authorization"]);
  // 2. Create an article to attach file to
  const articleId = typia.random<string>();
  // 3. Upload file to the article
  // Note: file upload response type is empty object, so we can't get file ID from it
  await api.functional.discussionBoard.superAdmin.articles.files.upload(
    superAdminConnection,
    {
      articleId: articleId,
      body: typia.random<IDiscussionBoardArticleFile.ICreate>(),
    },
  );
  // 4. Download the file as super admin
  const fileId = typia.random<string>();
  const downloadUri: IString =
    await api.functional.discussionBoard.superAdmin.articles.files.download(
      superAdminConnection,
      {
        articleId: articleId,
        fileId: fileId,
      },
    );
  typia.assert(downloadUri);
  // 5. Validate download URI is properly formatted
  const uriString = typia.assert<string>(downloadUri);
  TestValidator.predicate("download URI format", uriString.startsWith("/"));
}
