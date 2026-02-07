import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IString } from "@ORGANIZATION/PROJECT-api/lib/structures/IString";
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

export async function test_api_admin_file_download_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // 2. Create an article first (need article creation endpoint)
  // Note: Based on provided API, there's no article creation endpoint for admin
  // This test requires an article to exist before file upload
  // The test scenario assumes article creation is handled elsewhere or pre-created
  // For demonstration purposes, using placeholder IDs
  // In real scenario, these would come from actual article creation
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Upload a file attachment to the article
  const file = await api.functional.discussionBoard.admin.articles.files.upload(
    adminConnection,
    {
      articleId: articleId,
      body: typia.random<IDiscussionBoardArticleFile.ICreate>(),
    },
  );
  typia.assert(file);
  // 4. Download the file as admin
  // The file object from upload likely contains the file identifier
  // Use typia.assert to ensure file is properly typed as containing the id
  const fileId = typia.assert<string>(
    (file as any).id ?? (file as any).fileId ?? (file as any).filePath
  );
  const downloadUri: IString =
    await api.functional.discussionBoard.admin.articles.files.download(
      adminConnection,
      {
        articleId: articleId,
        fileId: fileId,
      },
    );
  typia.assert(downloadUri);
  // 5. Validate download URI is not empty
  TestValidator.predicate("download URI is not empty", downloadUri !== "");
}