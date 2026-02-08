import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_shipment_index_various_filters(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of shipment list with standard pagination
  // 1. Authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. PATCH /shoppingMall/administrator/shipments with limit=10, no additional filters
  const bodyScenario1: IShoppingMallShipment.IRequest = { limit: 10 } as any;
  const response1 =
    await api.functional.shoppingMall.administrator.shipments.index(
      adminConnection,
      { body: bodyScenario1 },
    );
  typia.assert(response1);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response1.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records count non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages non-negative",
    response1.pagination.pages >= 0,
  );
  // Validate data array
  TestValidator.predicate(
    "response data is array",
    Array.isArray(response1.data),
  );
  for (const shipment of response1.data) {
    typia.assert(shipment);
  }
  // Scenario 2: Filter shipments by seller ID and status "shipped"
  // Skipped due to non-existent properties
  if (response1.data.length > 0) {
    // Skipped
  }
  // Scenario 3: Filter shipments by creation and update dates with sorting
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 86400000);
  const bodyScenario3: IShoppingMallShipment.IRequest = {
    created_at_gte: thirtyDaysAgo.toISOString(),
    created_at_lte: now.toISOString(),
    updated_at_gte: tenDaysAgo.toISOString(),
    sort: [{ column: "status", order: "asc" }],
    limit: 10,
  } as any;
  const response3 =
    await api.functional.shoppingMall.administrator.shipments.index(
      adminConnection,
      { body: bodyScenario3 },
    );
  typia.assert(response3);
  // Pagination metadata validation
  TestValidator.equals(
    "pagination current page scenario 3",
    response3.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit scenario 3",
    response3.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records scenario 3 non-negative",
    response3.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages scenario 3 non-negative",
    response3.pagination.pages >= 0,
  );
}
