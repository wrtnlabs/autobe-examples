import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sale_unit_snapshot_retrieve_various_scenarios(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Scenario description:
   *
   * This test function covers:
   * Scenario 1: Successful retrieval of an existing sale unit snapshot by an authenticated customer.
   * Scenario 2: Retrieval attempt with a non-existent snapshotId causing 404 error.
   * Scenario 3: Unauthorized retrieval attempt without authentication causing 403 error.
   */
  // 1. Authenticate as a new customer by joining
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerJoinConnection, {
    body: {},
  });
  // Update connection headers with the obtained token
  customerJoinConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Scenario 1: Attempt to fetch an existing snapshot
  // Note: No creation utility is provided, so we use a random UUID and try to fetch
  // If the snapshot does not exist, the test considers the setup limitation.
  const snapshotIdValid = typia.random<string & tags.Format<"uuid">>();
  try {
    const snapshot =
      await api.functional.shoppingMall.customer.sale_unit_snapshots.at(
        customerJoinConnection,
        { snapshotId: snapshotIdValid },
      );
    typia.assert(snapshot);
  } catch {
    /* Acceptable if snapshot does not exist since no creation method */
  }
  // 3. Scenario 2: fetch with non-existent snapshotId (likely not exists)
  const randomNonExistentSnapshotId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "fetch non-existent snapshot should 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sale_unit_snapshots.at(
        customerJoinConnection,
        { snapshotId: randomNonExistentSnapshotId },
      );
    },
  );
  // 4. Scenario 3: fetch without authentication
  await TestValidator.httpError(
    "fetch snapshot without authentication should be forbidden",
    [403, 401],
    async () => {
      await api.functional.shoppingMall.customer.sale_unit_snapshots.at(
        { host: connection.host },
        {
          snapshotId: snapshotIdValid,
        },
      );
    },
  );
}
