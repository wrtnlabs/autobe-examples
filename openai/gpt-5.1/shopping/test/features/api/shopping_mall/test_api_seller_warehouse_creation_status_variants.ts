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
 * Validate seller warehouse creation with different lifecycle statuses.
 *
 * Business flow:
 *
 * 1. Register a seller using /auth/seller/join to obtain an authorized seller
 *    context.
 * 2. As the authenticated seller, create an "active" warehouse via POST
 *    /shoppingMall/seller/sellerWarehouses and validate the stored status and
 *    basic fields.
 * 3. Create another warehouse with a different, but still valid, status such as
 *    "inactive" and validate its stored status.
 * 4. Attempt to create a warehouse with an obviously invalid status string and
 *    assert that the operation fails.
 *
 * Notes:
 *
 * - The SDK automatically attaches the seller access token to `connection` after
 *   join, so subsequent calls are in seller context without manual header
 *   work.
 * - There is no GET-by-id warehouse endpoint in the provided SDK, so validation
 *   is performed against the POST responses only.
 */
export async function test_api_seller_warehouse_creation_status_variants(
  connection: api.IConnection,
) {
  // 1. Register seller and obtain authorized context
  const joinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create an "active" warehouse
  const activeStatus = "active";
  const activeWarehouseBody = {
    code: `WH-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_default_origin: true,
    status: activeStatus,
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const activeWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: activeWarehouseBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(activeWarehouse);

  // Verify basic echo and status behavior for active warehouse
  TestValidator.equals(
    "active warehouse status should match requested status",
    activeWarehouse.status,
    activeStatus,
  );
  TestValidator.equals(
    "active warehouse code should match requested code",
    activeWarehouse.code,
    activeWarehouseBody.code,
  );
  TestValidator.equals(
    "active warehouse name should match requested name",
    activeWarehouse.name,
    activeWarehouseBody.name,
  );
  TestValidator.equals(
    "active warehouse default origin flag should be true",
    activeWarehouse.is_default_origin,
    activeWarehouseBody.is_default_origin,
  );

  // 3. Create an "inactive" warehouse with distinct code
  const inactiveStatus = "inactive";
  const inactiveWarehouseBody = {
    code: `WH-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: null,
    is_default_origin: false,
    status: inactiveStatus,
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const inactiveWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: inactiveWarehouseBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(inactiveWarehouse);

  TestValidator.equals(
    "inactive warehouse status should match requested status",
    inactiveWarehouse.status,
    inactiveStatus,
  );
  TestValidator.equals(
    "inactive warehouse code should match requested code",
    inactiveWarehouse.code,
    inactiveWarehouseBody.code,
  );
  TestValidator.equals(
    "inactive warehouse default origin flag should be false",
    inactiveWarehouse.is_default_origin,
    inactiveWarehouseBody.is_default_origin,
  );

  // 4. Attempt to create warehouse with invalid status and expect failure
  const invalidStatus = "__invalid_status__";
  const invalidWarehouseBody = {
    code: `WH-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: null,
    is_default_origin: false,
    status: invalidStatus,
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  await TestValidator.error(
    "creating warehouse with invalid status should fail",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.create(
        connection,
        {
          body: invalidWarehouseBody,
        },
      );
    },
  );
}
