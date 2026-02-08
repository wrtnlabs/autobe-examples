import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleViewStat";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleViewStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sale_view_stats_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving sale view statistics without filters and validate pagination, authorization, and response structure.
  // 1. Administrator joins and obtains authorization token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  // Update adminConnection headers with authorization token
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Retrieve sale view statistics with empty request body (no filters)
  const response =
    await api.functional.shoppingMall.administrator.sale_view_stats.index(
      adminConnection,
      { body: {} satisfies IShoppingMallSaleViewStat.IRequest },
    );
  // 3. Validate response type
  typia.assert(response);
  // 4. Validate pagination metadata presence and consistency
  const { pagination, data } = response;
  // Pagination numbers must be non-negative, current page at least 1, pages count consistent
  TestValidator.predicate("pagination current >= 1", pagination.current >= 1);
  TestValidator.predicate("pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  // pages should be correct given records and limit, except when records = 0
  const calculatedPages =
    pagination.limit === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pagination pages consistency",
    pagination.pages,
    calculatedPages,
  );
  // 5. Validate that the data array is present
  TestValidator.predicate("response data is array", Array.isArray(data));
  // 6. If data is non-empty, validate typical sale view stat summary fields
  if (data.length > 0) {
    for (const entry of data) {
      typia.assert(entry); // Use typia.assert to validate all properties in the summary
      // Validate typical numeric fields - these fields should be >= 0 if exist
      // Since the schema doesn't define fields explicitly, no further manual check available
    }
  } else {
    // 7. Edge case: empty data array should be allowed without error
    TestValidator.equals("empty data array", data.length, 0);
  }
}
