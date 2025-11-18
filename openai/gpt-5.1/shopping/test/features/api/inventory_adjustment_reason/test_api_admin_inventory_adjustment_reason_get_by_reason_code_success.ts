import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

/**
 * Validate successful retrieval of an inventory adjustment reason by its
 * business code.
 *
 * Business flow:
 *
 * 1. Register an admin account using POST /auth/admin/join. This both creates the
 *    admin and configures the shared connection with an Authorization header
 *    via the SDK, so all subsequent calls run under this admin context.
 * 2. As this admin, create a new inventory adjustment reason using POST
 *    /shoppingMall/admin/inventoryAdjustmentReasons, supplying a unique test
 *    code (e.g. "AUDIT_LOSS_TEST" plus some random suffix) and fixed
 *    name/description/direction/is_system_managed values so we can assert them
 *    later.
 * 3. Call GET /shoppingMall/admin/inventoryAdjustmentReasons/{reasonCode} using
 *    the same business code we just created. This should return HTTP 200 with a
 *    full IShoppingMallInventoryAdjustmentReason payload for that code.
 * 4. Validate that the response structure matches the type via typia.assert, then
 *    assert key business fields:
 *
 *    - Id is a non-empty UUID string (typia.assert already checks the format).
 *    - Code, name, description, direction, and is_system_managed all match the
 *         values used during creation.
 *    - Created_at and updated_at are non-null date-time strings.
 *    - Deleted_at is null, indicating an active, not soft-deleted, record.
 *
 * This ensures that admins can reliably fetch configuration records by stable
 * business code and that the detail endpoint returns a consistent, correctly
 * shaped master-data record.
 */
export async function test_api_admin_inventory_adjustment_reason_get_by_reason_code_success(
  connection: api.IConnection,
) {
  // 1. Register an admin (authorization token is handled by SDK join function)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new inventory adjustment reason with a unique business code
  const uniqueSuffix = RandomGenerator.alphaNumeric(8);
  const reasonCode = `AUDIT_LOSS_TEST_${uniqueSuffix}`;

  const createBody = {
    code: reasonCode,
    name: "Audit loss (E2E test)",
    description:
      "Inventory loss discovered during audit for E2E test scenario.",
    direction: "decrease",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const created: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Business-level assertions on creation output
  TestValidator.equals(
    "created reason code should match input code",
    created.code,
    reasonCode,
  );
  TestValidator.equals(
    "created reason name should match input name",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created reason description should match input description",
    created.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "created reason direction should match input direction",
    created.direction,
    createBody.direction,
  );
  TestValidator.equals(
    "created reason is_system_managed should match input flag",
    created.is_system_managed,
    createBody.is_system_managed,
  );
  TestValidator.predicate(
    "created reason deleted_at should be null for active record",
    created.deleted_at === null,
  );

  // 3. Retrieve the inventory adjustment reason by its business code
  const fetched: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.at(
      connection,
      {
        reasonCode,
      },
    );
  typia.assert(fetched);

  // 4. Validate fetched record matches the created configuration
  TestValidator.equals(
    "fetched reason id should match created id",
    fetched.id,
    created.id,
  );
  TestValidator.equals(
    "fetched reason code should match created code",
    fetched.code,
    created.code,
  );
  TestValidator.equals(
    "fetched reason name should match created name",
    fetched.name,
    created.name,
  );
  TestValidator.equals(
    "fetched reason description should match created description",
    fetched.description ?? null,
    created.description ?? null,
  );
  TestValidator.equals(
    "fetched reason direction should match created direction",
    fetched.direction,
    created.direction,
  );
  TestValidator.equals(
    "fetched reason is_system_managed should match created flag",
    fetched.is_system_managed,
    created.is_system_managed,
  );

  TestValidator.predicate(
    "fetched reason created_at must be non-empty timestamp",
    fetched.created_at.length > 0,
  );
  TestValidator.predicate(
    "fetched reason updated_at must be non-empty timestamp",
    fetched.updated_at.length > 0,
  );
  TestValidator.predicate(
    "fetched reason deleted_at should be null for active record",
    fetched.deleted_at === null,
  );
}
