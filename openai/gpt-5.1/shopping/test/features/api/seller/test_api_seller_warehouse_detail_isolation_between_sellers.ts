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
 * Validate warehouse detail ownership isolation between different sellers.
 *
 * Business goal: Ensure that a seller cannot retrieve detailed information for
 * a warehouse owned by another seller via GET
 * /shoppingMall/seller/sellerWarehouses/{warehouseId}, while confirming that
 * the owning seller still has access.
 *
 * High-level workflow:
 *
 * 1. Register Seller A via POST /auth/seller/join. The SDK will attach Seller A's
 *    access token to the shared connection.
 * 2. As Seller A, create a seller warehouse via POST
 *    /shoppingMall/seller/sellerWarehouses and capture its id.
 * 3. Register Seller B via POST /auth/seller/join. This overwrites the
 *    Authorization header on the same connection with Seller B's token.
 * 4. As Seller B, attempt to GET Seller A's warehouse detail via GET
 *    /shoppingMall/seller/sellerWarehouses/{warehouseId} using the id from step
 *    2, and assert that this call fails (ownership isolation enforced).
 * 5. Optionally, re-join as Seller A (simplest way to restore Seller A context
 *    using the provided APIs) and confirm that GET on the same warehouse id now
 *    succeeds and returns the expected warehouse.
 *
 * Assertions and validation strategy:
 *
 * - Use typia.assert() on all successful API responses to enforce complete DTO
 *   type correctness at runtime.
 * - Use TestValidator.error() around the cross-seller GET call to assert that
 *   Seller B cannot access Seller A's warehouse. Do not assert specific HTTP
 *   status codes; only that an error occurs.
 * - Use TestValidator.equals() to verify that the warehouse retrieved by Seller A
 *   after re-authentication has the same id as the warehouse created in step
 *   2.
 *
 * DTOs and API functions used:
 *
 * - IShoppingMallSellerAuthJoin.IRequest as the request body type for
 *   api.functional.auth.seller.join.
 * - IShoppingMallSeller.IAuthorized as the response type for join operations.
 * - IShoppingMallSellerWarehouse.ICreate as the request body type for
 *   api.functional.shoppingMall.seller.sellerWarehouses.create.
 * - IShoppingMallSellerWarehouse as the response type for both create and at
 *   warehouse operations.
 *
 * Data generation:
 *
 * - Generate seller join payloads with
 *   typia.random<IShoppingMallSellerAuthJoin.IRequest>() to satisfy
 *   email/password/ip/href/referrer constraints.
 * - Generate warehouse creation payloads with
 *   typia.random<IShoppingMallSellerWarehouse.ICreate>() to satisfy code, name,
 *   description, is_default_origin, and status fields.
 */
export async function test_api_seller_warehouse_detail_isolation_between_sellers(
  connection: api.IConnection,
) {
  // 1. Register Seller A and obtain authorized seller context
  const sellerAJoinRequest =
    typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinRequest,
    });
  typia.assert(sellerA);

  // 2. As Seller A, create a warehouse and capture its id
  const warehouseCreateBody =
    typia.random<IShoppingMallSellerWarehouse.ICreate>();
  const sellerAWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseCreateBody,
      },
    );
  typia.assert(sellerAWarehouse);

  // 3. Register Seller B, which will overwrite the Authorization header
  const sellerBJoinRequest =
    typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinRequest,
    });
  typia.assert(sellerB);

  // 4. As Seller B, attempt to access Seller A's warehouse and expect failure
  await TestValidator.error(
    "Seller B cannot access Seller A's warehouse detail",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.at(connection, {
        warehouseId: sellerAWarehouse.id,
      });
    },
  );

  // 5. Re-join as Seller A (restore Seller A context) and confirm access works
  const sellerAReload: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinRequest,
    });
  typia.assert(sellerAReload);

  const warehouseRead: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.at(connection, {
      warehouseId: sellerAWarehouse.id,
    });
  typia.assert(warehouseRead);

  // Verify that the warehouse retrieved under Seller A matches the created one
  TestValidator.equals(
    "Warehouse id must match between create and owner read",
    warehouseRead.id,
    sellerAWarehouse.id,
  );
}
