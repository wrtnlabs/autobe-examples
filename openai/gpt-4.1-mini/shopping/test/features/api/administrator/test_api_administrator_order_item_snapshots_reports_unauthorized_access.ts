import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_order_item_snapshots_reports_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Description: Unauthorized access tests for PATCH /shoppingMall/administrator/orderItemSnapshots/reports
  // 1. Use base connection to call without any authentication - expect 401 or 403
  await TestValidator.httpError(
    "unauthorized access without login",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.orderItemSnapshots.reports.index(
        connection,
        {
          body: {},
        },
      );
    },
  );
  // 2. Prepare customer connection with random login (simulate)
  // but no administrator rights (no utility to login customer given, so skip actual customer auth - simulate base connection usage)
  // 3. Use base connection with Authorization header for a seller (simulate)
  // No utility function or API provided, so we simulate by setting Authorization header
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer fake-seller-token" },
  };
  await TestValidator.httpError(
    "unauthorized access with seller token",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.orderItemSnapshots.reports.index(
        sellerConnection,
        {
          body: {},
        },
      );
    },
  );
  // 4. Use base connection with Authorization header for a customer (simulate)
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer fake-customer-token" },
  };
  await TestValidator.httpError(
    "unauthorized access with customer token",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.orderItemSnapshots.reports.index(
        customerConnection,
        {
          body: {},
        },
      );
    },
  );
}
