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

export async function test_api_article_views_filtered_by_article_and_user_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // 2. Authenticate as administrator (join operation)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 3. Generate a random article_id to filter on
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 4. Query administrator article views filtered by article_id and user_type
  const viewRequest: IEconomicBoardArticleView.IRequest = {
    article_id: articleId,
    user_type: "administrator",
    page: 1,
    limit: 10,
  } satisfies IEconomicBoardArticleView.IRequest;
  const result =
    await api.functional.economicBoard.administrator.article_views.index(
      adminConnection,
      {
        body: viewRequest,
      },
    );
  typia.assert(result);
  // 5. Validate response structure
  // Check pagination metadata
  TestValidator.equals("page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 10", result.pagination.limit, 10);
  TestValidator.predicate(
    "records should be 0 or positive",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be 0 or positive",
    result.pagination.pages >= 0,
  );
  // Check data structure
  TestValidator.predicate("data is an array", Array.isArray(result.data));
  // Validate each summary item in data
  for (const summary of result.data) {
    typia.assert<IEconomicBoardArticleView.ISummary>(summary);
    TestValidator.equals(
      "article_id matches expected format",
      typeof summary.article_id,
      "string",
    );
    TestValidator.predicate(
      "article_id is UUID format",
      /^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/.test(
        summary.article_id,
      ),
    );
    TestValidator.predicate(
      "view_count is non-negative integer",
      Number.isInteger(summary.view_count) && summary.view_count >= 0,
    );
    TestValidator.predicate(
      "first_view is valid ISO date-time",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{1,9}Z$/.test(
        summary.first_view,
      ),
    );
    TestValidator.predicate(
      "last_view is valid ISO date-time",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{1,9}Z$/.test(
        summary.last_view,
      ),
    );
    TestValidator.predicate(
      "total_unique_users is non-negative integer",
      Number.isInteger(summary.total_unique_users) &&
        summary.total_unique_users >= 0,
    );
    // Validate that first_view precedes or equals last_view
    TestValidator.predicate(
      "first_view precedes or equals last_view",
      new Date(summary.first_view) <= new Date(summary.last_view),
    );
  }
  // Verify result matches schema exactly
  typia.assert<IPageIEconomicBoardArticleView.ISummary>(result);
}
