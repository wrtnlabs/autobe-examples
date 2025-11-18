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
 * Validate that a seller can partially update basic mutable fields of a
 * warehouse they own (name and description) while preserving identity and
 * non-updated fields.
 *
 * Business goals validated:
 *
 * 1. Authenticated seller can create a warehouse and then update it through the
 *    seller-facing endpoints.
 * 2. PUT /shoppingMall/seller/sellerWarehouses/{warehouseId} correctly applies
 *    partial updates when only a subset of IShoppingMallSellerWarehouse.IUpdate
 *    fields is supplied.
 * 3. Immutable/identity fields (id, code, created_at) remain stable.
 * 4. Omitted fields (is_default_origin, status) are preserved.
 * 5. Updated_at timestamp advances on successful update.
 *
 * Scenario steps:
 *
 * 1. Join a seller via /auth/seller/join to obtain an authenticated context.
 * 2. Create a warehouse with deterministic values using
 *    /shoppingMall/seller/sellerWarehouses.
 * 3. Capture the original warehouse fields including id, code, is_default_origin,
 *    status, created_at, and updated_at.
 * 4. Call update on the same warehouse with only name and description changed.
 * 5. Assert that response reflects updated name/description and preserved
 *    identity/flags, with updated_at > previous updated_at.
 */
export async function test_api_seller_warehouse_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Register a seller (join) to get an authenticated seller context.
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 2. Create an initial warehouse with deterministic values.
  const createBody = {
    code: "WH-UPDATE-1",
    name: "Original Name",
    description: "Original description",
    is_default_origin: false,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const originalWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      { body: createBody },
    );
  typia.assert(originalWarehouse);

  // Capture original fields for comparison.
  const originalId = originalWarehouse.id;
  const originalCode = originalWarehouse.code;
  const originalIsDefaultOrigin = originalWarehouse.is_default_origin;
  const originalStatus = originalWarehouse.status;
  const originalCreatedAt = originalWarehouse.created_at;
  const originalUpdatedAt = originalWarehouse.updated_at;

  // 3. Perform partial update: change only name and description.
  const updateBody = {
    name: "Updated Name",
    description: "Updated description",
  } satisfies IShoppingMallSellerWarehouse.IUpdate;

  const updatedWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.update(
      connection,
      {
        warehouseId: originalId,
        body: updateBody,
      },
    );
  typia.assert(updatedWarehouse);

  // 4. Validate identity and non-updated fields are preserved.
  TestValidator.equals(
    "warehouse id remains the same",
    updatedWarehouse.id,
    originalId,
  );
  TestValidator.equals(
    "warehouse code remains unchanged",
    updatedWarehouse.code,
    originalCode,
  );
  TestValidator.equals(
    "is_default_origin remains unchanged",
    updatedWarehouse.is_default_origin,
    originalIsDefaultOrigin,
  );
  TestValidator.equals(
    "status remains unchanged",
    updatedWarehouse.status,
    originalStatus,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedWarehouse.created_at,
    originalCreatedAt,
  );

  // 5. Validate updated fields reflect new values.
  TestValidator.equals(
    "name is updated",
    updatedWarehouse.name,
    "Updated Name",
  );
  TestValidator.equals(
    "description is updated",
    updatedWarehouse.description,
    "Updated description",
  );

  // 6. Validate updated_at advanced (lexicographical comparison on ISO string).
  TestValidator.predicate("updated_at string is greater than before", () => {
    // Both are ISO 8601 strings, so lexicographical comparison is valid.
    return updatedWarehouse.updated_at > originalUpdatedAt;
  });
}
