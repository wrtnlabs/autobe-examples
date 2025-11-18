import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate that an authenticated admin can retrieve detailed configuration for
 * a specific SKU inventory state using its UUID identifier.
 *
 * Business flow:
 *
 * 1. Register and implicitly authenticate an admin via POST /auth/admin/join.
 *
 *    - Use IShoppingMallAdminJoin.ICreate as request body.
 *    - Rely on SDK-side header management; do not touch connection.headers.
 * 2. As that admin, create a new SKU inventory state via POST
 *    /shoppingMall/admin/skuInventoryStates.
 *
 *    - Use IShoppingMallSkuInventoryState.ICreate as request body.
 *    - Capture the created state (especially id, code, name, description,
 *         is_purchasable, created_at, updated_at, deleted_at).
 * 3. Call GET /shoppingMall/admin/skuInventoryStates/{skuInventoryStateId} using
 *    the captured id via api.functional.shoppingMall.admin
 *    .skuInventoryStates.at.
 * 4. Validate that the detail response matches the created entity and satisfies
 *    business rules:
 *
 *    - The response is a valid IShoppingMallSkuInventoryState (typia.assert).
 *    - Id matches the created inventory state id.
 *    - Code, name, description, is_purchasable equal the values from the creation
 *         step.
 *    - Created_at and updated_at exist and created_at <= updated_at.
 *    - Deleted_at is null or undefined for a freshly created record.
 */
export async function test_api_sku_inventory_state_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Create a new SKU inventory state as this admin
  const createBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const createdState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(createdState);

  // 3. Retrieve the SKU inventory state detail by id
  const detailedState =
    await api.functional.shoppingMall.admin.skuInventoryStates.at(connection, {
      skuInventoryStateId: createdState.id,
    });
  typia.assert<IShoppingMallSkuInventoryState>(detailedState);

  // 4. Business validations
  // 4-1. Basic field equivalence checks
  TestValidator.equals(
    "inventory state id should match between create and detail",
    detailedState.id,
    createdState.id,
  );
  TestValidator.equals(
    "inventory state code should match between create and detail",
    detailedState.code,
    createBody.code,
  );
  TestValidator.equals(
    "inventory state name should match between create and detail",
    detailedState.name,
    createBody.name,
  );
  TestValidator.equals(
    "inventory state description should match between create and detail",
    detailedState.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "inventory state is_purchasable should match between create and detail",
    detailedState.is_purchasable,
    createBody.is_purchasable,
  );

  // 4-2. created_at and updated_at presence and temporal order
  await TestValidator.predicate(
    "created_at must be less than or equal to updated_at",
    async () => {
      const createdTime = Date.parse(detailedState.created_at);
      const updatedTime = Date.parse(detailedState.updated_at);
      return createdTime <= updatedTime;
    },
  );

  // 4-3. deleted_at should be null or undefined for a fresh record
  TestValidator.predicate(
    "deleted_at must be null or undefined for a newly created state",
    detailedState.deleted_at === null || detailedState.deleted_at === undefined,
  );
}
