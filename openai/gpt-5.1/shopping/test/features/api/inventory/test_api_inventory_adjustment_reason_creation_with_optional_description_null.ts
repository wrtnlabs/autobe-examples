import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

/**
 * Validate creation of an inventory adjustment reason when the optional
 * description field is omitted.
 *
 * ## Business context
 *
 * Inventory adjustment reasons are master data records used throughout the
 * shopping mall platform to explain why stock levels change. Each reason has a
 * stable business code, human-friendly name, directional semantics, and a flag
 * indicating whether it is system-managed. The description field is optional
 * documentation text that can be null/undefined when not needed.
 *
 * This test ensures that an administrator can create a new inventory adjustment
 * reason without providing a description and that the API persists the record
 * correctly while keeping description null/undefined.
 *
 * ## High-level steps
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authorized context
 *    (the SDK will set the Authorization header on the shared connection).
 * 2. Using the authenticated connection, call POST
 *    /shoppingMall/admin/inventoryAdjustmentReasons with a payload that:
 *
 *    - Provides a unique code string.
 *    - Provides a valid name string.
 *    - Omits the description field entirely.
 *    - Sets a realistic direction value (e.g., "increase").
 *    - Sets is_system_managed to false.
 * 3. Verify the API call succeeds and the response body:
 *
 *    - Passes typia.assert for IShoppingMallInventoryAdjustmentReason.
 *    - Echoes the same code, name, direction, and is_system_managed values that were
 *         sent.
 *    - Has description either null or undefined, confirming that omission of
 *         description is allowed and not implicitly populated with a non-empty
 *         value.
 *
 * By focusing on a valid creation flow with description omitted, this test
 * validates the handling of the nullable/optional description field without
 * requiring additional read endpoints.
 */
export async function test_api_inventory_adjustment_reason_creation_with_optional_description_null(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an inventory adjustment reason without description
  const code = `TEST_REASON_${RandomGenerator.alphaNumeric(12)}`;
  const name = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const direction = "increase";

  const createBody = {
    code,
    name,
    direction,
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const reason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(reason);

  // 3. Validate the created record
  TestValidator.equals(
    "inventory adjustment reason code should match input",
    reason.code,
    code,
  );
  TestValidator.equals(
    "inventory adjustment reason name should match input",
    reason.name,
    name,
  );
  TestValidator.equals(
    "inventory adjustment reason direction should match input",
    reason.direction,
    direction,
  );
  TestValidator.equals(
    "inventory adjustment reason should not be system-managed",
    reason.is_system_managed,
    false,
  );

  // Description must remain null or undefined when omitted in request
  TestValidator.predicate(
    "description should be null or undefined when omitted in create payload",
    reason.description === null || reason.description === undefined,
  );
}
