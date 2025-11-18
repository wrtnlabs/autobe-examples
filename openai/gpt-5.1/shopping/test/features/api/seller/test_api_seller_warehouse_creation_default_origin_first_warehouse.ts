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
 * Validate creation of a seller's first warehouse as default origin.
 *
 * Business context: A newly registered seller, who has no warehouses yet,
 * should be able to create a first warehouse and mark it as the default
 * shipping origin. The platform must accept this configuration without
 * uniqueness conflicts and should return a warehouse record reflecting that
 * default-origin status.
 *
 * Steps:
 *
 * 1. Join a new seller account using /auth/seller/join to obtain an authenticated
 *    seller context (authorization handled by SDK).
 * 2. Create a warehouse via POST /shoppingMall/seller/sellerWarehouses with
 *    is_default_origin set to true and a simple identifying code and name.
 * 3. Verify that the created warehouse record:
 *
 *    - Has is_default_origin === true
 *    - Preserves the requested code and name
 *    - Has status === "active" as specified in the request body
 *    - Stores description as null/empty in line with the request (we send null).
 */
export async function test_api_seller_warehouse_creation_default_origin_first_warehouse(
  connection: api.IConnection,
) {
  // 1. Join a new seller account to get an authenticated seller context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Optional IP: provide a valid ipv4 to better exercise the DTO.
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create the first warehouse with is_default_origin=true.
  const warehouseBody = {
    code: "WH-DEFAULT",
    name: "Primary Warehouse",
    description: null,
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(warehouse);

  // 3. Business rule and data integrity validations.
  TestValidator.equals(
    "created warehouse preserves requested code",
    warehouse.code,
    warehouseBody.code,
  );

  TestValidator.equals(
    "created warehouse preserves requested name",
    warehouse.name,
    warehouseBody.name,
  );

  TestValidator.equals(
    "created warehouse preserves requested status",
    warehouse.status,
    warehouseBody.status,
  );

  TestValidator.equals(
    "created warehouse is marked as default origin",
    warehouse.is_default_origin,
    true,
  );

  // description is optional, and backend may normalize null/undefined.
  TestValidator.predicate(
    "created warehouse description matches nullish expectation",
    () => warehouse.description === null || warehouse.description === undefined,
  );
}
