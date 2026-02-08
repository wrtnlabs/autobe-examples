import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_articles_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  // Administrator join with default join body (empty object as per IJoin type)
  await authorize_administrator_join(adminConnection, { body: {} });
  // 2. Prepare request body with no filters for default pagination
  const body: IDiscussionBoardArticle.IRequest = {};
  // 3. Call the articles list endpoint
  const page: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.administrator.articles.index(
      adminConnection,
      { body },
    );
  // 4. Assert response structure and content
  typia.assert(page);
  // 5. Validate pagination metadata
  const { pagination, data } = page;
  TestValidator.predicate(
    "pagination current page positive",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination limit positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination pages positive or zero",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records positive or zero",
    pagination.records >= 0,
  );
  // 6. Validate each article in data: Must be Summary and non-deleted (the endpoint excludes deleted articles)
  for (const article of data) {
    typia.assert(article); // Assert article summary structure
    // Cannot check deleted property as it is not in ISummary schema
    // Therefore we trust the endpoint specification that only non-deleted articles are returned
  }
  // 7. If pagination has any data, validate that data array length is not more than pagination.limit
  TestValidator.predicate(
    "data length does not exceed pagination limit",
    data.length <= pagination.limit,
  );
}
