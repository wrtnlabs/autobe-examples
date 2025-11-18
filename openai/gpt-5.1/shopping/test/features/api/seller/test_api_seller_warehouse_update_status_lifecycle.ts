import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";

/**
 * Validate seller warehouse status lifecycle transitions via update.
 *
 * Business goal: Ensure that a seller can change a warehouse status between
 * allowed lifecycle states (e.g., active -> inactive -> active) and that
 * clearly invalid statuses are rejected, using only the available create and
 * update APIs.
 *
 * Scenario outline:
 *
 * 1. Register a seller via POST /auth/seller/join to obtain an authenticated
 *    seller context.
 * 2. Create a warehouse for that seller via POST
 *    /shoppingMall/seller/sellerWarehouses with:
 *
 *    - Code: "WH-LIFECYCLE"
 *    - Status: "active"
 *    - Is_default_origin: false
 * 3. Update the warehouse status to a valid non-active state ("inactive"),
 *    asserting that the status changes while identity fields remain stable.
 * 4. Update the warehouse status back to "active" to confirm that reverse
 *    transitions succeed when allowed.
 * 5. Attempt to update the warehouse status to a clearly invalid value (e.g.,
 *    "**invalid**"), expecting the API to fail and wrapping the call in
 *    TestValidator.error.
 */
export async function test_api_seller_warehouse_update_status_lifecycle(
  connection: api.IConnection,
) {
  // 1. Register a seller and establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: joinBody });
  typia.assert(seller);

  // 2. Create an initial active warehouse
  const createBody = {
    code: "WH-LIFECYCLE",
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default_origin: false,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const created: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  TestValidator.equals(
    "created warehouse should be active",
    created.status,
    "active",
  );
  TestValidator.equals(
    "created warehouse code should match request",
    created.code,
    createBody.code,
  );

  // 3. Valid transition: active -> inactive
  const toInactiveBody = {
    status: "inactive",
  } satisfies IShoppingMallSellerWarehouse.IUpdate;

  const inactive: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.update(
      connection,
      {
        warehouseId: created.id,
        body: toInactiveBody,
      },
    );
  typia.assert(inactive);

  TestValidator.equals(
    "status should change from active to inactive",
    inactive.status,
    "inactive",
  );
  TestValidator.equals(
    "warehouse id must remain stable after inactive update",
    inactive.id,
    created.id,
  );
  TestValidator.equals(
    "warehouse code must remain stable after inactive update",
    inactive.code,
    created.code,
  );
  TestValidator.equals(
    "is_default_origin flag must remain stable after inactive update",
    inactive.is_default_origin,
    created.is_default_origin,
  );

  // 4. Valid transition: inactive -> active
  const toActiveBody = {
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.IUpdate;

  const reactivated: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.update(
      connection,
      {
        warehouseId: created.id,
        body: toActiveBody,
      },
    );
  typia.assert(reactivated);

  TestValidator.equals(
    "status should change back to active",
    reactivated.status,
    "active",
  );
  TestValidator.equals(
    "warehouse id must remain stable after reactivation",
    reactivated.id,
    created.id,
  );
  TestValidator.equals(
    "warehouse code must remain stable after reactivation",
    reactivated.code,
    created.code,
  );
  TestValidator.equals(
    "is_default_origin flag must remain stable after reactivation",
    reactivated.is_default_origin,
    created.is_default_origin,
  );

  // 5. Invalid status value should be rejected
  await TestValidator.error(
    "invalid warehouse status should fail",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.update(
        connection,
        {
          warehouseId: created.id,
          body: {
            status: "__invalid__",
          } satisfies IShoppingMallSellerWarehouse.IUpdate,
        },
      );
    },
  );
}
