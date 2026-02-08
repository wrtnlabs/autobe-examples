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
import { generate_random_discussion_board_article_search_indexes_create_article_search_index } from "../../../generate/generate_random_discussion_board_article_search_indexes_create_article_search_index";
import { prepare_random_discussion_board_article_search_index } from "../../../prepare/prepare_random_discussion_board_article_search_index";

export async function test_api_discussion_board_article_search_index_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of an article search index by an authorized administrator.
  // Preconditions: The administrator is authenticated and authorized.
  // An article search index record exists with the given indexId.
  // Steps:
  // 1. Authenticate as an administrator using the /discussionBoard/auth/administrator/join endpoint.
  // 2. Create a new article search index record via /discussionBoard/article-search-indexes POST.
  // 3. Delete the created article search index using the /discussionBoard/article-search-indexes/{indexId} DELETE endpoint.
  // 4. Validate that the response status is HTTP 204 No Content.
  // 5. Verify that the record no longer exists by attempting to retrieve it and expecting a 404 Not Found error.
  // 1. Administrator join and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create an article search index
  const articleSearchIndex =
    await generate_random_discussion_board_article_search_indexes_create_article_search_index(
      adminConnection,
      { body: {} },
    );
  typia.assert(articleSearchIndex);
  // 3. Delete the created article search index
  await api.functional.discussionBoard.article_search_indexes.erase(
    adminConnection,
    {
      indexId: (articleSearchIndex as any).indexId as string,
    },
  );
  // 4-5. Verify that the record no longer exists by trying to delete again and expect an error
  await TestValidator.httpError(
    "delete non-existent index should 404",
    404,
    async () =>
      await api.functional.discussionBoard.article_search_indexes.erase(
        adminConnection,
        {
          indexId: (articleSearchIndex as any).indexId as string,
        },
      ),
  );
}
