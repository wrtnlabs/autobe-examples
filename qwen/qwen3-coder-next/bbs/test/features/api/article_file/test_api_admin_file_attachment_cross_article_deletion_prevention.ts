import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_admin_file_attachment_cross_article_deletion_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Admin login
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Generate two different article IDs for testing
  const articleId1 = typia.random<string>();
  const articleId2 = typia.random<string>();
  // Generate file IDs for testing
  const fileId1 = typia.random<string>();
  const fileId2 = typia.random<string>();
  // Upload file to first article
  await api.functional.discussionBoard.admin.articles.files.upload(
    adminConnection,
    {
      articleId: articleId1,
      body: typia.random<IDiscussionBoardArticleFile.ICreate>(),
    },
  );
  // Upload file to second article
  await api.functional.discussionBoard.admin.articles.files.upload(
    adminConnection,
    {
      articleId: articleId2,
      body: typia.random<IDiscussionBoardArticleFile.ICreate>(),
    },
  );
  // Attempt to delete file from first article using the second article's ID (should fail with 404)
  await TestValidator.error(
    "should return 404 when file belongs to different article",
    async () =>
      await api.functional.discussionBoard.admin.articles.files.erase(
        adminConnection,
        {
          articleId: articleId2,
          fileId: fileId1,
        },
      ),
  );
  // Delete file from first article using correct article ID
  await api.functional.discussionBoard.admin.articles.files.erase(
    adminConnection,
    {
      articleId: articleId1,
      fileId: fileId1,
    },
  );
  // Delete file from second article
  await api.functional.discussionBoard.admin.articles.files.erase(
    adminConnection,
    {
      articleId: articleId2,
      fileId: fileId2,
    },
  );
}
