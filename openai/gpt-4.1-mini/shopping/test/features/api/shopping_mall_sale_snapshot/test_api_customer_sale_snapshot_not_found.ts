import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test retrieving a sale snapshot with a non-existing snapshotId as an authenticated customer.
 * Expect HTTP 404 Not Found error.
 */
export async function test_api_customer_sale_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // 1. Register customer and get authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(customerJoin);
  // Attach token to customerConnection
  customerConnection.headers = {
    Authorization: customerJoin.token.access,
  };
  // 2. Attempt to get sale snapshot with a valid but non-existing UUID
  const nonExistingSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError("sale snapshot not found", 404, async () => {
    await api.functional.shoppingMall.customer.sale_snapshots.at(
      customerConnection,
      {
        snapshotId: nonExistingSnapshotId,
      },
    );
  });
}
