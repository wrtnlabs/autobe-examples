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
 * Validate that seller warehouse detail API returns an error for unknown
 * warehouse IDs while working correctly for existing warehouses.
 *
 * Business context: A seller manages one or more warehouses through the seller
 * portal. The detail API `/shoppingMall/seller/sellerWarehouses/{warehouseId}`
 * should return full configuration for a warehouse when the ID exists and
 * should fail with a not-found style error when the requested warehouse does
 * not exist or does not belong to the authenticated seller.
 *
 * This test focuses on the not-found behavior for an unknown warehouse ID,
 * while also confirming that the same endpoint works for a valid warehouse
 * owned by the seller.
 *
 * Steps:
 *
 * 1. Join as a new seller using `/auth/seller/join`, obtaining an authenticated
 *    seller session via SDK side effects on the connection.
 * 2. Create a real warehouse for this seller via
 *    `/shoppingMall/seller/sellerWarehouses` using
 *    IShoppingMallSellerWarehouse.ICreate.
 * 3. Retrieve the warehouse detail by its real id to confirm the happy path works,
 *    then validate basic invariants.
 * 4. Generate a random UUID that does not match the existing warehouse id.
 * 5. Call the detail API with the non-existent warehouseId and verify that an
 *    HttpError is thrown via TestValidator.error, without asserting a specific
 *    HTTP status code.
 * 6. Ensure we never touch connection.headers directly and rely on the SDK to
 *    manage Authorization.
 */
export async function test_api_seller_warehouse_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Join as a new seller to get authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a real warehouse for this seller
  const createWarehouseBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const createdWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: createWarehouseBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(createdWarehouse);

  // 3. Positive control: fetch the existing warehouse by id and validate
  const existingWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.at(connection, {
      warehouseId: createdWarehouse.id,
    });
  typia.assert<IShoppingMallSellerWarehouse>(existingWarehouse);

  TestValidator.equals(
    "existing warehouse id should match created id",
    existingWarehouse.id,
    createdWarehouse.id,
  );

  TestValidator.equals(
    "existing warehouse code should match created code",
    existingWarehouse.code,
    createdWarehouse.code,
  );

  // 4. Generate a UUID that does not match any known warehouse id
  let unknownWarehouseId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (unknownWarehouseId === createdWarehouse.id) {
    // extremely unlikely, but regenerate to guarantee difference
    unknownWarehouseId = typia.random<string & tags.Format<"uuid">>();
  }

  TestValidator.notEquals(
    "unknown id must differ from created warehouse id",
    unknownWarehouseId,
    createdWarehouse.id,
  );

  // 5. Call detail endpoint with non-existent id and expect an HttpError
  await TestValidator.error(
    "unknown warehouseId should produce error",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.at(connection, {
        warehouseId: unknownWarehouseId,
      });
    },
  );
}
