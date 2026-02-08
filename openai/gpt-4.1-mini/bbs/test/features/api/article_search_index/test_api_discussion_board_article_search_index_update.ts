import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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

export async function test_api_discussion_board_article_search_index_update(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful Update of Article Search Index
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Prepare existing indexId and updated data
  const validIndexId = typia.random<string & tags.Format<"uuid">>();
  const updatedBody = {};
  // 3. Attempt updating the article search index successfully
  const updatedIndex =
    await api.functional.discussionBoard.article_search_indexes.updateArticleSearchIndex(
      adminConnection,
      {
        indexId: validIndexId,
        body: updatedBody,
      },
    );
  typia.assert(updatedIndex);
  // Scenario 2: Update Fails When Article Search Index Not Found
  const fakeIndexId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "update fails when article search index not found",
    404,
    async () => {
      await api.functional.discussionBoard.article_search_indexes.updateArticleSearchIndex(
        adminConnection,
        {
          indexId: fakeIndexId,
          body: updatedBody,
        },
      );
    },
  );
  // Scenario 3: Unauthorized Update Attempt
  // 3-1. No authentication
  await TestValidator.httpError(
    "update fails when unauthorized - no auth",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.article_search_indexes.updateArticleSearchIndex(
        connection,
        {
          indexId: validIndexId,
          body: updatedBody,
        },
      );
    },
  );
  // 3-2. Authentication but no admin privileges
  const userConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "update fails when unauthorized - non-admin",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.article_search_indexes.updateArticleSearchIndex(
        userConnection,
        {
          indexId: validIndexId,
          body: updatedBody,
        },
      );
    },
  );
}
