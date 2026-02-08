import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_snapshot_access_denied_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authorize Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAJoin = await authorize_customer_join(customerAConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  customerAConnection.headers = { Authorization: customerAJoin.token.access };
  // 2. Create and authorize Customer B (the attacker)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBJoin = await authorize_customer_join(customerBConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  customerBConnection.headers = { Authorization: customerBJoin.token.access };
  // 3. Customer A creates an order snapshot by accessing a valid snapshot ID
  // Since no SDK or utilities for creating snapshots provided, simulate by random UUID
  // We assume an existing snapshot id owned by customer A
  // Use a random valid UUID as snapshotId to simulate
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Normally Customer A can access snapshot, but Customer B must NOT
  // 4. Customer B tries to access the snapshot owned by Customer A
  //    and expects an authorization failure (e.g., HTTP 403 Forbidden)
  await TestValidator.httpError(
    "access denied to non-owner customer",
    403,
    async () => {
      await api.functional.shoppingMall.customer.order_snapshots.at(
        customerBConnection,
        {
          snapshotId,
        },
      );
    },
  );
}
