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

export async function test_api_admin_file_listing_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Generate a valid article ID for testing
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Call the file listing endpoint for an article
  const files = await api.functional.discussionBoard.admin.articles.files.index(
    adminConnection,
    {
      articleId,
    },
  );
  // Validate the response structure using the correct type
  typia.assert(files);
  // Validate pagination structure
  TestValidator.predicate("pagination exists", files.pagination !== undefined);
  TestValidator.predicate("data array exists", files.data !== undefined);
  TestValidator.predicate(
    "pagination has required fields",
    files.pagination.current > 0 &&
      files.pagination.limit > 0 &&
      files.pagination.records >= 0 &&
      files.pagination.pages >= 0,
  );
}
