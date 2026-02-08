import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_inventory_audit_logs_filtered_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving inventory audit logs filtered by a date range.
  // The test confirms that the returned audit log records come with accurate pagination info and are fetched with administrator authorization.
  // 1. Administrator joins and gains authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  typia.assert(adminAuth);
  // 2. Define date range for filtering audit logs
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // 30 days ago
  const endDate = new Date();
  // 3. Prepare request body with date range filter and pagination parameters
  const requestBody: IShoppingMallInventoryHistory.IRequest = {
    created_at_start: startDate.toISOString(),
    created_at_end: endDate.toISOString(),
    page: 1, // pagination page
    limit: 10, // page size
  };
  // 4. Call the inventory audit logs index API
  const response =
    await api.functional.shoppingMall.administrator.inventory.audit_logs.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(response);
  // 5. Validate pagination info
  TestValidator.predicate(
    "pagination current page valid",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages valid",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records valid",
    response.pagination.records >= 0,
  );
  // 6. Validate audit logs data existence (properties like created_at and deleted_at do not exist in DTO, so cannot validate)
  for (const log of response.data) {
    typia.assert(log);
  }
}
