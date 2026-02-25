import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_file_download_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(authorizedAdmin);
  // 2. Generate random article and file IDs for testing download endpoint
  const randomArticleId = typia.random<string & tags.Format<"uuid">>();
  const randomFileId = typia.random<string & tags.Format<"uuid">>();
  // 3. Download the file using admin connection
  const downloadResponse =
    await api.functional.discussionBoard.admin.articles.files.download.downloadFile(
      adminConnection,
      {
        articleId: randomArticleId,
        fileId: randomFileId,
      },
    );
  typia.assert(downloadResponse);
  // 4. Validate response structure matches IDiscussionBoardArticleFile.IDownload
  TestValidator.predicate("has valid download URL", () => {
    try {
      new URL(downloadResponse.downloadUrl);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate(
    "has MIME type",
    () =>
      typeof downloadResponse.mimeType === "string" &&
      downloadResponse.mimeType.length > 0,
  );
  TestValidator.predicate(
    "has original filename",
    () =>
      typeof downloadResponse.originalFilename === "string" &&
      downloadResponse.originalFilename.length > 0,
  );
  TestValidator.predicate(
    "has non-negative file size",
    () =>
      typeof downloadResponse.fileSize === "number" &&
      downloadResponse.fileSize >= 0,
  );
}
