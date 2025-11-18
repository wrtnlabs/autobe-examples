import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

/**
 * Validate creation of a system-managed inventory adjustment reason by an
 * authenticated admin.
 *
 * Business goals:
 *
 * - Ensure that an admin can register a new standardized inventory adjustment
 *   reason via the POST /shoppingMall/admin/inventoryAdjustmentReasons
 *   endpoint.
 * - Verify that the is_system_managed flag is honored and persisted when set to
 *   true, as this governs whether the reason is platform-controlled.
 * - Confirm that key attributes (code, name, description, direction) in the
 *   response reflect the input payload, and that the created record is
 *   logically active (deleted_at is null or undefined).
 *
 * High-level flow:
 *
 * 1. Join an admin via POST /auth/admin/join to bootstrap an administrator account
 *    and obtain an authenticated admin context (SDK automatically injects the
 *    access token into connection.headers.Authorization).
 * 2. Call POST /shoppingMall/admin/inventoryAdjustmentReasons using
 *    api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create with a
 *    payload satisfying IShoppingMallInventoryAdjustmentReason.ICreate, where:
 *
 *    - Code is a unique, stable identifier (e.g., "SYSTEM_DAMAGE_LOSS" plus a random
 *         suffix to avoid unique index collisions).
 *    - Name is a human-readable label like "System Damage/Loss".
 *    - Description provides detailed guidance text.
 *    - Direction is set to a valid semantic, such as "decrease".
 *    - Is_system_managed is true.
 * 3. Validate the response as IShoppingMallInventoryAdjustmentReason via
 *    typia.assert, then check business expectations with TestValidator:
 *
 *    - Code, name, description, direction, is_system_managed equal the request.
 *    - Is_system_managed is true.
 *    - Deleted_at is null or undefined, indicating an active record.
 *    - Created_at and updated_at exist as strings (their format is already
 *         guaranteed by typia.assert).
 *
 * Notes:
 *
 * - The scenario description originally mentioned an optional GET by reason code.
 *   That corresponding SDK function is not provided, so this test limits itself
 *   to validating the POST response object.
 * - No negative or type-error tests are implemented, adhering to the prohibition
 *   on deliberate type mismatches. The test focuses exclusively on the happy
 *   path where a system-managed reason is created successfully.
 */
export async function test_api_inventory_adjustment_reason_creation_with_system_managed_flag(
  connection: api.IConnection,
) {
  // 1. Bootstrap an admin via join to establish authenticated admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a unique, system-managed inventory adjustment reason payload.
  const baseCode = "SYSTEM_DAMAGE_LOSS";
  const randomSuffix = RandomGenerator.alphaNumeric(8);
  const reasonCode = `${baseCode}_${randomSuffix}`;

  const createReasonBody = {
    code: reasonCode,
    name: "System Damage/Loss",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 10,
    }),
    direction: "decrease",
    is_system_managed: true,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const createdReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: createReasonBody,
      },
    );
  typia.assert(createdReason);

  // 3. Business validations on the created reason.
  TestValidator.equals(
    "inventory adjustment reason code should match request",
    createdReason.code,
    createReasonBody.code,
  );

  TestValidator.equals(
    "inventory adjustment reason name should match request",
    createdReason.name,
    createReasonBody.name,
  );

  TestValidator.equals(
    "inventory adjustment reason description should match request",
    createdReason.description ?? null,
    createReasonBody.description ?? null,
  );

  TestValidator.equals(
    "inventory adjustment reason direction should match request",
    createdReason.direction,
    createReasonBody.direction,
  );

  TestValidator.equals(
    "inventory adjustment reason is_system_managed should be true",
    createdReason.is_system_managed,
    true,
  );

  // deleted_at must represent an active record: null or undefined.
  TestValidator.predicate(
    "inventory adjustment reason should not be soft-deleted upon creation",
    createdReason.deleted_at === null || createdReason.deleted_at === undefined,
  );

  // created_at and updated_at existence is already strongly validated by typia.assert,
  // but we can still assert non-empty strings to reflect business expectations.
  TestValidator.predicate(
    "created_at should be a non-empty date-time string",
    createdReason.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty date-time string",
    createdReason.updated_at.length > 0,
  );
}
