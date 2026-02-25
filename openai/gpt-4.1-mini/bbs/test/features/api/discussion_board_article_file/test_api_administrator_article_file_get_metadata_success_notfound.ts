import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_article_file_get_metadata_success_notfound(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of article file metadata by an administrator.
  // Scenario 2: Retrieval attempt for non-existing article file.
  // 1. Authorize administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPassword123!",
    },
  });
  adminConnection.headers = { Authorization: admin.token.access };
  // 2. Scenario 1: Create valid UUIDs for articleId and fileId
  const validArticleId = typia.random<string & tags.Format<"uuid">>();
  const validFileId = typia.random<string & tags.Format<"uuid">>();
  // 3. Fetch metadata for existing article file
  const metadata =
    await api.functional.discussionBoard.administrator.articles.files.atFile(
      adminConnection,
      { articleId: validArticleId, fileId: validFileId },
    );
  typia.assert(metadata);
  // Validate the file metadata matches the requested IDs
  TestValidator.equals("file id matches", metadata.id, validFileId);
  TestValidator.equals(
    "article id matches",
    metadata.articleId,
    validArticleId,
  );
  // 4. Scenario 2: Attempt retrieval with non-existing fileId
  const nonExistingFileId = typia.random<string & tags.Format<"uuid">>();
  // Using a different articleId for clarity but still a valid UUID
  const someArticleId = typia.random<string & tags.Format<"uuid">>();
  // 5. Validate 404 Not Found error for non-existing file
  await TestValidator.httpError(
    "retrieval of non-existing file",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.articles.files.atFile(
        adminConnection,
        { articleId: someArticleId, fileId: nonExistingFileId },
      );
    },
  );
}
