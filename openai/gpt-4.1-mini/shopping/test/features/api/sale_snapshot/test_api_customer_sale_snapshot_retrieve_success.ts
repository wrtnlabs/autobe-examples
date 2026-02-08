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

export async function test_api_customer_sale_snapshot_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving an existing sale snapshot by snapshotId as an authenticated customer.
  // This test ensures successful retrieval of full sale snapshot details.
  // 1. Customer registration and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin = {};
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Generate a valid snapshotId (UUID) for retrieval test
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the sale snapshot by snapshotId
  const snapshot = await api.functional.shoppingMall.customer.sale_snapshots.at(
    customerConnection,
    { snapshotId },
  );
  typia.assert(snapshot);
  // No further property validation due to missing properties in the type
}
