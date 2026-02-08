import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Authorization: Join customer to get authorization token for subsequent access
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  // Prepare a non-existent snapshot ID (valid UUID format, but presumably not existing)
  const invalidSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the order item snapshot using the invalid ID
  await TestValidator.httpError(
    "order item snapshot not found returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.orderItemSnapshots.at(
        customerConnection,
        {
          id: invalidSnapshotId,
        },
      );
    },
  );
}
