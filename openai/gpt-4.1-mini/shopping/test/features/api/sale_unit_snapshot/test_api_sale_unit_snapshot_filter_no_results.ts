import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnitSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_sale_unit_snapshot_filter_no_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Perform administrator join to get authorization token
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Set Authorization Header
  adminConnection.headers = {
    Authorization: "Bearer " + adminAuth.token.access,
  };
  // 2. Filter with non-existent SKU code
  const emptyBySku =
    await api.functional.shoppingMall.administrator.sale_unit_snapshots.index(
      adminConnection,
      {
        body: {
          skuCode: "NON_EXISTENT_SKU_CODE_1234567890",
        } satisfies IShoppingMallSaleUnitSnapshot.IRequest,
      },
    );
  typia.assert(emptyBySku);
  // Validate that data array is empty
  TestValidator.equals(
    "empty data for non-existent SKU code",
    emptyBySku.data.length,
    0,
  );
  // Validate pagination metadata correctness
  TestValidator.predicate(
    "pagination properties presence",
    emptyBySku.pagination !== null &&
      typeof emptyBySku.pagination.current === "number" &&
      typeof emptyBySku.pagination.limit === "number" &&
      typeof emptyBySku.pagination.records === "number" &&
      typeof emptyBySku.pagination.pages === "number",
  );
  // 3. Filter by date range with no matching results
  // Use far past range assumed to have no entries
  const farPastStart = new Date("2000-01-01T00:00:00.000Z").toISOString();
  const farPastEnd = new Date("2000-01-02T00:00:00.000Z").toISOString();
  const emptyByDateRange =
    await api.functional.shoppingMall.administrator.sale_unit_snapshots.index(
      adminConnection,
      {
        body: {
          createdAtBegin: farPastStart,
          createdAtEnd: farPastEnd,
        } satisfies IShoppingMallSaleUnitSnapshot.IRequest,
      },
    );
  typia.assert(emptyByDateRange);
  TestValidator.equals(
    "empty data for far past date range",
    emptyByDateRange.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination properties presence for date range",
    emptyByDateRange.pagination !== null &&
      typeof emptyByDateRange.pagination.current === "number" &&
      typeof emptyByDateRange.pagination.limit === "number" &&
      typeof emptyByDateRange.pagination.records === "number" &&
      typeof emptyByDateRange.pagination.pages === "number",
  );
}
