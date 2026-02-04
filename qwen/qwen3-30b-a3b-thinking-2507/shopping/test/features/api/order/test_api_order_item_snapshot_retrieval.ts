import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSalesOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrderItem";
import type { IShoppingMallSalesOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_item_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authentication as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {}, // IJoin for admin account is empty
  });
  // 2. Generate test IDs (UUIDs) for order, order item, and snapshot
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Execute API call to get snapshot
  const snapshot: IShoppingMallSalesOrderItemSnapshot =
    await api.functional.shoppingMall.admin.orders.order_items.snapshots.at(
      adminConnection,
      {
        orderId,
        orderItemId,
        snapshotId,
      },
    );
  // 4. Validate response structure
  typia.assert(snapshot);
}
