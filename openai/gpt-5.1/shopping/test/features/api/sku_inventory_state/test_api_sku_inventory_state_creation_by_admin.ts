import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate that an authenticated admin can create a new SKU inventory state
 * with the expected persisted fields.
 *
 * Business context:
 *
 * - SKU inventory states are global reference data controlling how SKUs behave in
 *   catalog and checkout flows.
 * - Only authenticated admins are allowed to define new inventory states.
 * - A newly created state should immediately be usable and carry proper lifecycle
 *   timestamps.
 *
 * Flow:
 *
 * 1. Register a fresh admin via POST /auth/admin/join.
 *
 *    - This call both creates the admin row and configures the SDK connection with
 *         an Authorization header using the returned access token.
 * 2. Using the authenticated admin context, create a new inventory state via POST
 *    /shoppingMall/admin/skuInventoryStates.
 *
 *    - Provide a unique machine-readable code.
 *    - Provide a human-readable name and an explicit description.
 *    - Mark the state as purchasable (is_purchasable = true).
 * 3. Validate the create response:
 *
 *    - It must structurally match IShoppingMallSkuInventoryState (checked by
 *         typia.assert).
 *    - Id must be a non-empty UUID string.
 *    - Code, name, description, is_purchasable must echo the request payload.
 *    - Created_at and updated_at must be non-empty date-time strings.
 *    - Deleted_at must be null (or effectively treated as null/absent) for an active
 *         record.
 *
 * Notes:
 *
 * - We do not test unauthenticated or non-admin callers here because the SDK
 *   manages Authorization headers internally and we must not manipulate
 *   connection.headers directly in tests.
 * - No GET-by-id confirmation is implemented because the corresponding endpoint
 *   is not present in the provided SDK. The create response is treated as the
 *   source of truth and validated thoroughly instead.
 */
export async function test_api_sku_inventory_state_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join and authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123" as string & tags.Format<"password">,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new SKU inventory state as this admin
  const skuStateCreateBody = {
    code: `in_stock_lab_only_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const createdState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuStateCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(createdState);

  // 3. Business and persistence validations
  // 3-1. Basic non-empty id check (UUID format already validated by typia)
  TestValidator.predicate(
    "created SKU inventory state id must be non-empty",
    createdState.id.length > 0,
  );

  // 3-2. Echoed payload fields
  TestValidator.equals(
    "created SKU inventory state code must match request",
    createdState.code,
    skuStateCreateBody.code,
  );
  TestValidator.equals(
    "created SKU inventory state name must match request",
    createdState.name,
    skuStateCreateBody.name,
  );
  TestValidator.equals(
    "created SKU inventory state description must match request",
    createdState.description ?? null,
    skuStateCreateBody.description ?? null,
  );
  TestValidator.equals(
    "created SKU inventory state is_purchasable must match request",
    createdState.is_purchasable,
    skuStateCreateBody.is_purchasable,
  );

  // 3-3. Audit timestamps
  TestValidator.predicate(
    "created_at must be a non-empty date-time string",
    createdState.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty date-time string",
    createdState.updated_at.length > 0,
  );

  // 3-4. Active record should not be soft-deleted
  TestValidator.equals(
    "deleted_at must be null for freshly created inventory state",
    createdState.deleted_at ?? null,
    null,
  );
}
