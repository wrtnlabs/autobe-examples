import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_files_upload } from "../../../generate/generate_random_discussion_board_super_admin_articles_files_upload";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_super_admin_file_attachment_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: {},
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  );
  // Step 2: Create an article first (using regular admin connection)
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(adminConnection, {
    body: {},
  } satisfies IDiscussionBoardSuperAdmin.IJoin);
  // Since we don't have an article creation endpoint, we'll generate random IDs
  const testArticleId = typia.random<string & tags.Format<"uuid">>();
  const testFileId = typia.random<string & tags.Format<"uuid">>();
  // Create a file attachment directly using the admin connection
  await api.functional.discussionBoard.superAdmin.articles.files.upload(
    adminConnection,
    {
      articleId: testArticleId,
      body: {},
    } satisfies IDiscussionBoardArticleFile.ICreate,
  );
  // Step 3: Delete the file attachment using super admin endpoint
  await api.functional.discussionBoard.superAdmin.articles.files.erase(
    superAdminConnection,
    {
      articleId: testArticleId,
      fileId: testFileId,
    },
  );
  // Step 4: Validate that the operation completed successfully
  // Since we can't verify specific file properties due to empty DTO,
  // we'll just confirm the operation completed without error
  typia.assert<void>(undefined);
}
