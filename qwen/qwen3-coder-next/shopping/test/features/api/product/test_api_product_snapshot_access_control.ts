import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test product snapshot access control functionality.
 * Verifies that only authorized users can access product snapshots.
 *
 * Test scenarios:
 * 1. Customer accessing a product snapshot (authorized)
 * 2. Unauthorized access attempts (should return 403)
 * 3. Invalid snapshot ID handling (should return 404)
 */
export async function test_api_product_snapshot_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection with valid authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    },
  });
  // 2. Test snapshot access with valid customer (authorized)
  // Use valid UUIDs for product and snapshot
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.products.snapshots.atSnapshot(
      customerConnection,
      {
        productId: productId,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 3. Test unauthorized access with different customer
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("should reject unauthorized access", async () => {
    await api.functional.shoppingMall.products.snapshots.atSnapshot(
      unauthorizedConnection,
      {
        productId: productId,
        snapshotId: snapshotId,
      },
    );
  });
  // 4. Test invalid snapshot ID format
  await TestValidator.httpError(
    "should return 404 for invalid snapshot",
    404,
    async () => {
      await api.functional.shoppingMall.products.snapshots.atSnapshot(
        customerConnection,
        {
          productId: productId,
          snapshotId: "invalid-uuid-format",
        },
      );
    },
  );
}
