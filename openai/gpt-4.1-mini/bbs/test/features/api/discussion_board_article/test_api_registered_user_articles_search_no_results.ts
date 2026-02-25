import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_registered_user_articles_search_no_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare a registered user connection by joining
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const user = await authorize_registered_user_join(registeredUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securepassword123",
    },
  });
  typia.assert(user);
  registeredUserConnection.headers = {
    Authorization: user.token.access,
  };
  // 2. Prepare a search request that is guaranteed to produce no results
  // Use a random string unlikely to appear in any article
  const noResultSearchRequest: IDiscussionBoardArticle.IRequest = {
    search: "unlikely_search_term_" + RandomGenerator.alphaNumeric(20),
    page: 1,
    limit: 10,
    sort: "newest",
  };
  // 3. Call the search API
  const response =
    await api.functional.discussionBoard.registeredUser.articles.search(
      registeredUserConnection,
      {
        body: noResultSearchRequest,
      },
    );
  // 4. Validate the response shape and empty data
  typia.assert(response);
  TestValidator.equals("data array should be empty", response.data.length, 0);
  TestValidator.equals(
    "pagination records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    response.pagination.limit,
    10,
  );
}
