import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";

export async function test_api_seller_warehouse_update_default_origin_toggle(
  connection: api.IConnection,
) {
  // 1. Register a seller to obtain an authenticated seller context.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create Warehouse A as the initial default origin.
  const warehouseACreateBody = {
    code: `WH-A-${RandomGenerator.alphaNumeric(8)}`,
    name: "Warehouse A - Default Origin",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouseA: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseACreateBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(warehouseA);

  // 3. Create Warehouse B as a non-default warehouse that will be promoted.
  const warehouseBCreateBody = {
    code: `WH-B-${RandomGenerator.alphaNumeric(8)}`,
    name: "Warehouse B - Non Default",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_default_origin: false,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouseB: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseBCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(warehouseB);

  // 4. Sanity checks before update: A is default, B is not.
  TestValidator.predicate(
    "warehouse A should initially be default origin",
    warehouseA.is_default_origin === true,
  );
  TestValidator.predicate(
    "warehouse B should initially be non-default origin",
    warehouseB.is_default_origin === false,
  );

  // 5. Update Warehouse B to become the new default origin.
  const warehouseBUpdateBody = {
    // Only toggle the default-origin flag and slightly adjust name/description
    name: "Warehouse B - Now Default",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default_origin: true,
  } satisfies IShoppingMallSellerWarehouse.IUpdate;

  const updatedWarehouseB: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.update(
      connection,
      {
        warehouseId: warehouseB.id,
        body: warehouseBUpdateBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(updatedWarehouseB);

  // 6. Validate that Warehouse B is now default origin.
  TestValidator.predicate(
    "warehouse B should become default origin after update",
    updatedWarehouseB.is_default_origin === true,
  );

  // 7. Validate the default-origin invariant within our two-warehouse view.
  // We expect that after promoting B to default, A should no longer be the
  // default origin. We cannot re-fetch A without a GET API, but the
  // business rule says at most one default origin per seller, so we
  // validate that A and B cannot both be default at the same time.
  TestValidator.predicate(
    "at most one default origin within known warehouses after toggle",
    !(
      warehouseA.is_default_origin === true &&
      updatedWarehouseB.is_default_origin === true
    ),
  );

  // Additionally ensure that the update operated on the intended warehouse ID.
  TestValidator.equals(
    "updated warehouse B should preserve its id",
    updatedWarehouseB.id,
    warehouseB.id,
  );

  // Ensure the two warehouses are distinct entities.
  TestValidator.notEquals(
    "warehouse A and warehouse B must have different ids",
    warehouseA.id,
    warehouseB.id,
  );
}
