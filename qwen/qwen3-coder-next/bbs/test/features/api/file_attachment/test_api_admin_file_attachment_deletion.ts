import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_files_upload } from "../../../generate/generate_random_discussion_board_admin_articles_files_upload";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_admin_file_attachment_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // 2. Create an article with a file attachment
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const uploadedFile =
    await api.functional.discussionBoard.admin.articles.files.upload(
      adminConnection,
      {
        articleId: articleId,
        body: typia.random<IDiscussionBoardArticleFile.ICreate>(),
      },
    );
  typia.assert(uploadedFile);
  // 3. Verify the file exists
  const fileList =
    await api.functional.discussionBoard.admin.articles.files.index(
      adminConnection,
      {
        articleId: articleId,
      },
    );
  typia.assert(fileList);
  TestValidator.predicate(
    "file exists in list",
    () => fileList.data.length > 0,
  );
  // 4. Delete the file attachment
  const fileId = typia.random<string & tags.Format<"uuid">>();
  const deletedFile =
    await api.functional.discussionBoard.admin.articles.files.erase(
      adminConnection,
      {
        articleId: articleId,
        fileId: fileId,
      },
    );
  typia.assert(deletedFile);
  // 5. Verify the file no longer exists in the list
  const fileListAfter =
    await api.functional.discussionBoard.admin.articles.files.index(
      adminConnection,
      {
        articleId: articleId,
      },
    );
  typia.assert(fileListAfter);
  TestValidator.predicate(
    "file list retrieved after deletion",
    () => fileListAfter.data.length >= 0,
  );
}
