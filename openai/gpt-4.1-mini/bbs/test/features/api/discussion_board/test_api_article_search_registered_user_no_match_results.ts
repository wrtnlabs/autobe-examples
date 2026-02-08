import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_article_search_registered_user_no_match_results(
  connection: api.IConnection,
): Promise<void> {
  // Register a new user for authorized access
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userJoinConnection, {
    body: {},
  });
  // Create a new connection for the authorized user
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Call the article search API with empty filter to simulate no match
  const output =
    await api.functional.discussionBoard.registeredUser.search.articles.index(
      userConnection,
      {
        body: {},
      },
    );
  // Assert the response structure
  typia.assert(output);
  // Validate that the results are empty
  TestValidator.equals("empty data array", output.data.length, 0);
  TestValidator.equals("records count is zero", output.pagination.records, 0);
  TestValidator.equals("pages count is zero", output.pagination.pages, 0);
  TestValidator.equals(
    "current page is 1 or default",
    output.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10 or default", output.pagination.limit, 10);
}
