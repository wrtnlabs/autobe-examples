import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleView";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleView";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_article_views_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator to access analytics endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // 2. Test pagination boundaries: limit=1 (minimum), limit=100 (maximum), page=0 (should clamp to 1), page=1
  // Test case 1: limit=1, page=0 (should be clamped to page=1)
  const response1 =
    await api.functional.economicBoard.administrator.article_views.index(
      adminConnection,
      {
        body: {
          limit: 1,
          page: 0,
        } satisfies IEconomicBoardArticleView.IRequest,
      },
    );
  typia.assert(response1);
  TestValidator.equals(
    "page=0 should be clamped to page=1",
    response1.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit=1 should be preserved",
    response1.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "at least one record returned",
    response1.data.length >= 1,
  );
  response1.data.forEach((item) => {
    typia.assert<IEconomicBoardArticleView.ISummary>(item);
    TestValidator.predicate("view_count is non-negative", item.view_count >= 0);
    TestValidator.predicate(
      "total_unique_users is non-negative",
      item.total_unique_users >= 0,
    );
  });
  // Test case 2: limit=100 (maximum)
  const response2 =
    await api.functional.economicBoard.administrator.article_views.index(
      adminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IEconomicBoardArticleView.IRequest,
      },
    );
  typia.assert(response2);
  TestValidator.equals(
    "limit=100 should be preserved",
    response2.pagination.limit,
    100,
  );
  TestValidator.equals(
    "page=1 should be preserved",
    response2.pagination.current,
    1,
  );
  TestValidator.predicate(
    "at least one record returned",
    response2.data.length >= 1,
  );
  response2.data.forEach((item) => {
    typia.assert<IEconomicBoardArticleView.ISummary>(item);
    TestValidator.predicate("view_count is non-negative", item.view_count >= 0);
    TestValidator.predicate(
      "total_unique_users is non-negative",
      item.total_unique_users >= 0,
    );
  });
  // Test case 3: limit=0 (should clamp to default=20)
  const response3 =
    await api.functional.economicBoard.administrator.article_views.index(
      adminConnection,
      {
        body: {
          limit: 0,
          page: 1,
        } satisfies IEconomicBoardArticleView.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals(
    "limit=0 should be clamped to default=20",
    response3.pagination.limit,
    20,
  );
  TestValidator.equals(
    "page=1 should be preserved",
    response3.pagination.current,
    1,
  );
  TestValidator.predicate(
    "at least one record returned",
    response3.data.length >= 1,
  );
  response3.data.forEach((item) => {
    typia.assert<IEconomicBoardArticleView.ISummary>(item);
    TestValidator.predicate("view_count is non-negative", item.view_count >= 0);
    TestValidator.predicate(
      "total_unique_users is non-negative",
      item.total_unique_users >= 0,
    );
  });
  // Test case 4: limit=101 (should clamp to maximum=100)
  const response4 =
    await api.functional.economicBoard.administrator.article_views.index(
      adminConnection,
      {
        body: {
          limit: 101,
          page: 1,
        } satisfies IEconomicBoardArticleView.IRequest,
      },
    );
  typia.assert(response4);
  TestValidator.equals(
    "limit=101 should be clamped to maximum=100",
    response4.pagination.limit,
    100,
  );
  TestValidator.equals(
    "page=1 should be preserved",
    response4.pagination.current,
    1,
  );
  TestValidator.predicate(
    "at least one record returned",
    response4.data.length >= 1,
  );
  response4.data.forEach((item) => {
    typia.assert<IEconomicBoardArticleView.ISummary>(item);
    TestValidator.predicate("view_count is non-negative", item.view_count >= 0);
    TestValidator.predicate(
      "total_unique_users is non-negative",
      item.total_unique_users >= 0,
    );
  });
  // 3. Verify that pagination metadata is correctly calculated
  // We expect records >= data.length, pages = ceil(records / limit), and current = page
  const allResponses = [response1, response2, response3, response4];
  allResponses.forEach((response) => {
    TestValidator.predicate(
      "records >= data.length",
      response.pagination.records >= response.data.length,
    );
    TestValidator.predicate(
      "pages >= 1 or both 0",
      response.pagination.pages >= 1 ||
        (response.pagination.records === 0 && response.pagination.pages === 0),
    );
    if (response.pagination.records > 0) {
      TestValidator.equals(
        "pages calculated correctly",
        response.pagination.pages,
        Math.ceil(response.pagination.records / response.pagination.limit),
      );
    }
    TestValidator.equals(
      "current page matches requested",
      response.pagination.current,
      response.pagination.pages || 1,
    );
  });
} 