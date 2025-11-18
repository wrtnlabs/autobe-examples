import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";

export async function test_api_seller_warehouse_detail_by_owner(
  connection: api.IConnection,
) {
  /**
   * Validate that an authenticated seller can retrieve detailed information
   * about one of their own warehouses.
   *
   * Business flow:
   *
   * 1. Join as a seller via /auth/seller/join to obtain an authenticated seller
   *    context and authorization token.
   * 2. Create a new warehouse owned by that seller via
   *    /shoppingMall/seller/sellerWarehouses with an
   *    IShoppingMallSellerWarehouse.ICreate payload.
   * 3. Call the detail endpoint
   *    /shoppingMall/seller/sellerWarehouses/{warehouseId} using the warehouse
   *    id returned from step 2.
   * 4. Validate that the detail response matches the created warehouse’s
   *    attributes and that lifecycle timestamps behave as expected.
   */

  // 1. Join as seller to establish authenticated context
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Optional ip: leave undefined to let backend infer from connection
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(authorizedSeller);
  typia.assert<IAuthorizationToken>(authorizedSeller.token);

  // 2. Create a new warehouse for this seller
  const createWarehouseBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
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
  typia.assert(createdWarehouse);

  // Basic field equality checks between create request and created resource
  TestValidator.equals(
    "created warehouse code matches request",
    createdWarehouse.code,
    createWarehouseBody.code,
  );
  TestValidator.equals(
    "created warehouse name matches request",
    createdWarehouse.name,
    createWarehouseBody.name,
  );
  TestValidator.equals(
    "created warehouse description matches request",
    createdWarehouse.description ?? null,
    createWarehouseBody.description ?? null,
  );
  TestValidator.equals(
    "created warehouse default origin flag matches request",
    createdWarehouse.is_default_origin,
    createWarehouseBody.is_default_origin,
  );
  TestValidator.equals(
    "created warehouse status matches request",
    createdWarehouse.status,
    createWarehouseBody.status,
  );

  // 3. Retrieve warehouse details by id for the same seller
  const detailedWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.at(connection, {
      warehouseId: createdWarehouse.id,
    });
  typia.assert(detailedWarehouse);

  // 4. Validate detail response consistency
  TestValidator.equals(
    "detail warehouse id matches created id",
    detailedWarehouse.id,
    createdWarehouse.id,
  );
  TestValidator.equals(
    "detail warehouse code matches created code",
    detailedWarehouse.code,
    createdWarehouse.code,
  );
  TestValidator.equals(
    "detail warehouse name matches created name",
    detailedWarehouse.name,
    createdWarehouse.name,
  );
  TestValidator.equals(
    "detail warehouse description matches created description",
    detailedWarehouse.description ?? null,
    createdWarehouse.description ?? null,
  );
  TestValidator.equals(
    "detail warehouse default origin flag matches created flag",
    detailedWarehouse.is_default_origin,
    createdWarehouse.is_default_origin,
  );
  TestValidator.equals(
    "detail warehouse status matches created status",
    detailedWarehouse.status,
    createdWarehouse.status,
  );

  // Lifecycle timestamp validations
  TestValidator.predicate(
    "created_at is a non-empty ISO date-time string on created warehouse",
    !!createdWarehouse.created_at,
  );
  TestValidator.predicate(
    "updated_at is a non-empty ISO date-time string on created warehouse",
    !!createdWarehouse.updated_at,
  );

  TestValidator.predicate(
    "created_at is a non-empty ISO date-time string on detailed warehouse",
    !!detailedWarehouse.created_at,
  );
  TestValidator.predicate(
    "updated_at is a non-empty ISO date-time string on detailed warehouse",
    !!detailedWarehouse.updated_at,
  );

  // Ensure updated_at is not earlier than created_at on the detailed record
  const createdAtTime = new Date(detailedWarehouse.created_at).getTime();
  const updatedAtTime = new Date(detailedWarehouse.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is greater than or equal to created_at on detailed warehouse",
    updatedAtTime >= createdAtTime,
  );

  // For a freshly created active warehouse, deleted_at should be null
  TestValidator.equals(
    "created warehouse deleted_at is null",
    createdWarehouse.deleted_at ?? null,
    null,
  );
  TestValidator.equals(
    "detailed warehouse deleted_at is null",
    detailedWarehouse.deleted_at ?? null,
    null,
  );
}
