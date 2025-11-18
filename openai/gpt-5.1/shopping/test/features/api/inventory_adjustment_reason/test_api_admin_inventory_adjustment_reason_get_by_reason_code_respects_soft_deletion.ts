import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

/**
 * Verify GET-by-code behavior for inventory adjustment reasons in the presence
 * of (conceptual) soft deletion.
 *
 * Business context
 *
 * - Inventory adjustment reasons are master data, soft-deletable via deleted_at.
 * - The GET-by-code endpoint documentation clearly states it should, by default,
 *   only return non-deleted (deleted_at === null) reasons.
 * - We do not have an explicit delete/update API in the provided SDK, so we
 *   cannot physically mark a record as soft-deleted from this test.
 *
 * Therefore this E2E test focuses on
 *
 * 1. Happy path: an admin can create a new inventory adjustment reason and
 *    immediately retrieve it by its business code, confirming deleted_at is
 *    null (active record) and that all key fields echo the creation payload.
 * 2. Negative behavior representative of soft-deletion semantics: the endpoint
 *    must not leak non-existent or (conceptually) soft-deleted codes. As we
 *    cannot actually mark a record deleted, we approximate this by requesting a
 *    random, never-created code and verifying that the API fails
 *    (business-level not-found style), using TestValidator.error without
 *    checking status codes.
 *
 * Steps
 *
 * 1. Admin join
 *
 *    - Call POST /auth/admin/join with IShoppingMallAdminJoin.ICreate.
 *    - This both creates an admin row and injects an Authorization token into the
 *         underlying connection used by the SDK.
 *    - Assert the IShoppingMallAdmin.IAuthorized payload.
 * 2. Create inventory adjustment reason
 *
 *    - Call POST /shoppingMall/admin/inventoryAdjustmentReasons with
 *         IShoppingMallInventoryAdjustmentReason.ICreate, using a deterministic
 *         business code like "SOFT_DELETE_TEST_" +
 *         RandomGenerator.alphaNumeric(8).
 *    - Set direction to a concrete semantic like "increase" and is_system_managed to
 *         false (admin-managed configuration).
 *    - Assert the returned IShoppingMallInventoryAdjustmentReason and verify that:
 *
 *         - Code, name, description, direction, is_system_managed match the request body,
 *                   and
 *         - Deleted_at is null (active, not soft-deleted).
 * 3. GET-by-code happy path
 *
 *    - Call GET /shoppingMall/admin/inventoryAdjustmentReasons/{reasonCode} using
 *         the same code created in step 2.
 *    - Assert the response type with typia.assert.
 *    - Verify business expectations:
 *
 *         - Code matches the created one,
 *         - Deleted_at is null (still active),
 *         - And key business fields (direction, is_system_managed) match the created
 *                   record.
 * 4. GET-by-code for a non-existent (conceptually soft-deleted) code
 *
 *    - Generate a random, clearly non-existent code such as
 *         "SOFT_DELETE_NON_EXISTENT_" + RandomGenerator.alphaNumeric(12),
 *         making sure it's different from the created code.
 *    - Call GET /shoppingMall/admin/inventoryAdjustmentReasons/{reasonCode} inside
 *         TestValidator.error with an async callback and await it.
 *    - This validates that the endpoint does not successfully return a record for
 *         codes that do not exist (or would be soft-deleted in real scenarios),
 *         aligning with the documented behavior of not returning logically
 *         deleted reasons by default.
 */
export async function test_api_admin_inventory_adjustment_reason_get_by_reason_code_respects_soft_deletion(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authorized admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);
  TestValidator.predicate(
    "admin join should return active (non-deleted) admin",
    adminAuthorized.deleted_at === null,
  );

  // 2. Create an inventory adjustment reason with a unique business code
  const reasonCode = `SOFT_DELETE_TEST_${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    code: reasonCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    direction: "increase",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const createdReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdReason);

  // Validate that created record matches request payload and is active
  TestValidator.equals(
    "created reason code should match request code",
    createdReason.code,
    createBody.code,
  );
  TestValidator.equals(
    "created reason name should match request name",
    createdReason.name,
    createBody.name,
  );
  TestValidator.equals(
    "created reason description should match request description",
    createdReason.description,
    createBody.description,
  );
  TestValidator.equals(
    "created reason direction should match request direction",
    createdReason.direction,
    createBody.direction,
  );
  TestValidator.equals(
    "created reason system-managed flag should match request flag",
    createdReason.is_system_managed,
    createBody.is_system_managed,
  );
  TestValidator.predicate(
    "created reason should not be soft-deleted (deleted_at null)",
    createdReason.deleted_at === null,
  );

  // 3. GET-by-code happy path for the active reason
  const fetchedReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.at(
      connection,
      {
        reasonCode,
      },
    );
  typia.assert(fetchedReason);

  TestValidator.equals(
    "fetched reason code should equal created reason code",
    fetchedReason.code,
    createdReason.code,
  );
  TestValidator.equals(
    "fetched reason direction should equal created reason direction",
    fetchedReason.direction,
    createdReason.direction,
  );
  TestValidator.equals(
    "fetched reason system-managed flag should equal created reason flag",
    fetchedReason.is_system_managed,
    createdReason.is_system_managed,
  );
  TestValidator.predicate(
    "fetched reason should still be active (deleted_at null)",
    fetchedReason.deleted_at === null,
  );

  // 4. GET-by-code for a non-existent code (representing soft-deleted/nonexistent)
  const nonExistentCode = `SOFT_DELETE_NON_EXISTENT_${RandomGenerator.alphaNumeric(12)}`;

  // Ensure our non-existent code does not equal the created one
  TestValidator.predicate(
    "non-existent reason code must differ from created code",
    nonExistentCode !== reasonCode,
  );

  await TestValidator.error(
    "get-by-code should fail for non-existent (or conceptually soft-deleted) reason code",
    async () => {
      await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.at(
        connection,
        {
          reasonCode: nonExistentCode,
        },
      );
    },
  );
}
