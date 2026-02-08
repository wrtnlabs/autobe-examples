import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_discussion_board_article_search_index_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to delete a non-existent article search index record by an authorized administrator.
  // Preconditions: The administrator is authenticated and authorized.
  // The provided indexId does not correspond to any existing article search index record.
  // 1. Admin registration & authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Inject Authorization headers with the access token
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Attempt to delete a non-existent article search index record with a random UUID
  const randomIndexId = typia.random<string & tags.Format<"uuid">>();
  // 3. Validate that the API returns an HTTP 404 Not Found error
  await TestValidator.httpError(
    "delete non-existent article search index returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.article_search_indexes.erase(
        adminConnection,
        {
          indexId: randomIndexId,
        },
      );
    },
  );
}
