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
 * Verify that an authenticated seller can create a basic warehouse with only
 * required fields and minimal optional values, and that the system populates
 * system-managed fields correctly.
 *
 * Business flow:
 *
 * 1. Register a new seller account via /auth/seller/join using random but valid
 *    join data.
 *
 *    - This call returns IShoppingMallSeller.IAuthorized and also sets the
 *         Authorization header on the shared connection, establishing the
 *         seller context for subsequent calls.
 * 2. Call /shoppingMall/seller/sellerWarehouses (create) with an
 *    IShoppingMallSellerWarehouse.ICreate payload that contains:
 *
 *    - Code: a seller-unique string such as "WH-SEOUL-01".
 *    - Name: a human-readable name such as "Seoul Main Warehouse".
 *    - Description: explicitly null, to represent no additional notes.
 *    - Is_default_origin: false so we are not changing default origin behavior.
 *    - Status: an active-like value such as "active" to indicate normal operation.
 * 3. Assert that the create call succeeds and the response body is a valid
 *    IShoppingMallSellerWarehouse.
 * 4. Validate core semantics on the returned warehouse:
 *
 *    - Id is a non-empty UUID string (relying on typia.assert for strict
 *         validation).
 *    - Code, name, description, is_default_origin, and status exactly match the
 *         request payload.
 *    - Created_at and updated_at are present and valid date-time strings (also
 *         guaranteed by typia.assert).
 *    - Deleted_at is null or undefined for a freshly created, active warehouse.
 *
 * The test focuses on the happy path for basic warehouse creation and does not
 * attempt error or type-validation scenarios.
 */
export async function test_api_seller_warehouse_creation_basic(
  connection: api.IConnection,
) {
  // 1. Register a new seller via join to obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const authorizedSeller = await api.functional.auth.seller.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller);

  // 2. Create a basic warehouse with minimal payload
  const warehouseCreateBody = {
    code: "WH-SEOUL-01",
    name: "Seoul Main Warehouse",
    description: null,
    is_default_origin: false,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const createdWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(createdWarehouse);

  // 3. Validate that the response echoes back the request payload where applicable
  TestValidator.equals(
    "warehouse code should match the requested code",
    createdWarehouse.code,
    warehouseCreateBody.code,
  );
  TestValidator.equals(
    "warehouse name should match the requested name",
    createdWarehouse.name,
    warehouseCreateBody.name,
  );
  TestValidator.equals(
    "warehouse description should match the requested description (null)",
    createdWarehouse.description ?? null,
    warehouseCreateBody.description,
  );
  TestValidator.equals(
    "warehouse default-origin flag should match the requested flag",
    createdWarehouse.is_default_origin,
    warehouseCreateBody.is_default_origin,
  );
  TestValidator.equals(
    "warehouse status should match the requested status",
    createdWarehouse.status,
    warehouseCreateBody.status,
  );

  // 4. Business sanity checks on system-managed fields
  // typia.assert has already guaranteed UUID and date-time formats, so only
  // simple semantic checks are performed here.
  TestValidator.predicate(
    "created warehouse id must be a non-empty string",
    createdWarehouse.id.length > 0,
  );

  TestValidator.equals(
    "newly created warehouse should not be soft-deleted",
    createdWarehouse.deleted_at ?? null,
    null,
  );
}
