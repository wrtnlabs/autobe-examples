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

export async function test_api_administrator_sale_view_stats_pagination_and_cursor_navigation(
  connection: api.IConnection,
): Promise<void> {
  // Test pagination and cursor navigation for retrieving sale view statistics.
  // 1. Authenticate as administrator using authorize_administrator_join utility.
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Since IShoppingMallSaleViewStat.IRequest is empty, we cannot pass cursor or limit
  // Perform multiple requests to test API stability and response correctness
  let previousDataCount = 0;
  const maxPages = 10;
  for (let i = 1; i <= maxPages; ++i) {
    const page =
      await api.functional.shoppingMall.administrator.sale_view_stats.index(
        adminConnection,
        { body: {} },
      );
    typia.assert(page);
    // Validate pagination info object
    TestValidator.predicate(
      `page ${i} pagination exists`,
      page.pagination !== undefined,
    );
    TestValidator.predicate(
      `page ${i} pagination has current >= 0`,
      page.pagination.current >= 0,
    );
    TestValidator.predicate(
      `page ${i} pagination has limit >= 0`,
      page.pagination.limit >= 0,
    );
    TestValidator.predicate(
      `page ${i} pagination has records >= 0`,
      page.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page ${i} pagination has pages >= 0`,
      page.pagination.pages >= 0,
    );
    // Validate data is an array
    TestValidator.predicate(
      `page ${i} data is array`,
      Array.isArray(page.data),
    );
    // Stopping criteria: if data array length is 0, it indicates an empty page, so break
    if (page.data.length === 0) break;
    previousDataCount = page.data.length;
  }
  // 3. Test unauthorized access fails
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized access to sale view stats",
    async () => {
      await api.functional.shoppingMall.administrator.sale_view_stats.index(
        guestConnection,
        { body: {} },
      );
    },
  );
}
