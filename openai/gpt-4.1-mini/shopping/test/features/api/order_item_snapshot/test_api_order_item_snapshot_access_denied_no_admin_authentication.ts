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

export async function test_api_order_item_snapshot_access_denied_no_admin_authentication(
  connection: api.IConnection,
): Promise<void> {
  // We do NOT perform administrator join or login to simulate no admin authentication
  // Create a new connection object to isolate the test
  const userConnection: api.IConnection = { host: connection.host };
  // Prepare a sample request body with random or empty filters and defaults
  const requestBody: IShoppingMallOrderItemSnapshot.IRequest = {
    productName: undefined,
    variantSku: undefined,
    itemStatus: undefined,
    sellerShopName: undefined,
    createdAtFrom: undefined,
    createdAtTo: undefined,
    page: 1,
    limit: 10,
    sort: "-created_at",
  };
  // Attempt to call the order item snapshots index API without admin auth
  await TestValidator.httpError(
    "access denied for order item snapshots without admin authentication",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.orderItemSnapshots.index(
        userConnection,
        { body: requestBody },
      );
    },
  );
}
