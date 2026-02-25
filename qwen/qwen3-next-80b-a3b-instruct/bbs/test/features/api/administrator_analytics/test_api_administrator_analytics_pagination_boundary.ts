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

export async function test_api_administrator_analytics_pagination_boundary(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using join utility function
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // Use the authenticated admin connection to call the analytics endpoint
  const response =
    await api.functional.economicBoard.administrator.analytics.index(
      adminConnection,
    );
  typia.assert(response);
  // Validate pagination structure — server defaults to page=1, limit=30 (assumed)
  TestValidator.equals(
    "pagination current page is the first page (default)",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Verify that data array exists and has at least one record
  TestValidator.predicate(
    "data array has at least one item",
    response.data.length >= 1,
  );
  // Validate the structure of the data items
  for (const item of response.data) {
    TestValidator.equals(
      "item has valid article_id",
      typeof item.article_id,
      "string",
    );
    TestValidator.predicate("item has valid view_count", item.view_count >= 0);
    TestValidator.predicate(
      "item has valid first_view",
      new Date(item.first_view) <= new Date(),
    );
    TestValidator.predicate(
      "item has valid last_view",
      new Date(item.last_view) <= new Date(),
    );
    TestValidator.predicate(
      "item has valid total_unique_users",
      item.total_unique_users >= 0,
    );
    // Ensure date-time formats are valid ISO 8601
    TestValidator.predicate(
      "first_view is ISO 8601",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item.first_view),
    );
    TestValidator.predicate(
      "last_view is ISO 8601",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item.last_view),
    );
  }
}
