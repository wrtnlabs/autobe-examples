import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that attempting to retrieve a non-existent order item snapshot returns a proper 404 Not Found error.
 *
 * Validates that when a customer provides an invalid or non-existent snapshotId UUID, the system returns a 404 Not Found error with appropriate error handling. This ensures graceful handling of invalid snapshot references and prevents information leakage about the system's data structure.
 *
 * 1. Authenticate customer using authorize_customer_join utility function.
 * 2. Generate a random UUID that doesn't exist in the database.
 * 3. Attempt to retrieve the non-existent snapshot using the API.
 * 4. Validate that the operation throws an HttpError with status code 404.
 */
export async function test_api_order_item_snapshot_not_found(
  connection: api.IConnection,
) {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Generate a non-existent snapshot ID
  const nonExistentSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent snapshot and validate 404 error
  await TestValidator.httpError(
    "non-existent snapshot returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.customer.order_item_snapshots.at(
        customerConnection,
        {
          snapshotId: nonExistentSnapshotId,
        },
      ),
  );
}
