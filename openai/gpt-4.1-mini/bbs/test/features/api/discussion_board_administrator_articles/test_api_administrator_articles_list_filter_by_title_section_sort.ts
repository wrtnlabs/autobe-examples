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

export async function test_api_administrator_articles_list_filter_by_title_section_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // 2. Call the articles list API with empty filter (because IRequest has no filter properties)
  const response =
    await api.functional.discussionBoard.administrator.articles.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 3. Validate pagination info
  TestValidator.predicate(
    "pagination current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // 4. Validate that data is an array
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // 5. Validate each article summary (the schema ISummary is empty, so just assert type)
  for (const article of response.data) {
    typia.assert(article);
  }
}
