import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_article_search_index_not_found_for_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // The scenario tests fetching a non-existent article search index with administrator authorization.
  // 1. Create an administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // Use utility function to join as administrator
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Update adminConnection headers with the auth token internally done by utility
  // 2. Generate a random UUID which does not exist
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the article search index with the non-existent id
  // Expect HttpError 404 Not Found
  await TestValidator.httpError(
    "fetch non-existent article search index should fail with 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.article_search_indexes.at(
        adminConnection,
        { searchIndexId: nonexistentId },
      );
    },
  );
}
