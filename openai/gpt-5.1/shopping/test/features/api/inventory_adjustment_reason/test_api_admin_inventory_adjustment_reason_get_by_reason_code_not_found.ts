import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

/**
 * Ensure GET-by-reasonCode returns a not-found style error for non-existent
 * codes without leaking internal implementation details.
 *
 * Business flow:
 *
 * 1. Join an admin account via POST /auth/admin/join to obtain an authenticated
 *    admin session.
 * 2. Optionally create a valid inventory adjustment reason so that we know the
 *    inventory-adjustment-reason domain is operational under this admin.
 * 3. Call GET /shoppingMall/admin/inventoryAdjustmentReasons/{reasonCode} with a
 *    clearly impossible code like "NON_EXISTENT_REASON_9999".
 * 4. Verify that the call fails with an HttpError (simulating a not-found style
 *    behavior) instead of returning a successful payload.
 * 5. Assert that the error message does not obviously leak SQL or low-level
 *    implementation details (e.g., no "SELECT " or "FROM shopping_mall_" in the
 *    serialized error message).
 */
export async function test_api_admin_inventory_adjustment_reason_get_by_reason_code_not_found(
  connection: api.IConnection,
) {
  // 1. Admin join to acquire authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Optionally create a valid inventory adjustment reason to ensure domain works
  const createReasonBody = {
    code: `TEST_REASON_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    direction: RandomGenerator.pick([
      "increase",
      "decrease",
      "neutral",
    ] as const),
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const createdReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: createReasonBody,
      },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(createdReason);

  // 3. Call GET-by-code with a clearly non-existent code
  const nonExistentCode = "NON_EXISTENT_REASON_9999";

  // 4. Expect an HttpError rather than a successful payload
  await TestValidator.error(
    "non-existent inventory adjustment reason should result in error",
    async () => {
      await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.at(
        connection,
        {
          reasonCode: nonExistentCode,
        },
      );
    },
  );

  // For deeper validation of error shape and message content, call directly and inspect
  try {
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.at(
      connection,
      {
        reasonCode: nonExistentCode,
      },
    );
  } catch (exp) {
    // We cannot rely on HttpError type explicitly here without importing it,
    // but we can still inspect the error's string representation.
    const message = String((exp as Error).message ?? exp);

    // 5. Assert that the error message does not leak obvious SQL internals
    TestValidator.predicate(
      "error message should not contain obvious SQL keywords",
      !message.toLowerCase().includes("select ") &&
        !message.toLowerCase().includes("update ") &&
        !message.toLowerCase().includes("delete ") &&
        !message.toLowerCase().includes("insert ") &&
        !message.toLowerCase().includes(" from ") &&
        !message.toLowerCase().includes(" where "),
    );

    return;
  }

  // If no error was thrown, explicitly fail the test
  throw new Error(
    "GET /shoppingMall/admin/inventoryAdjustmentReasons/{reasonCode} unexpectedly succeeded for a non-existent code.",
  );
}
