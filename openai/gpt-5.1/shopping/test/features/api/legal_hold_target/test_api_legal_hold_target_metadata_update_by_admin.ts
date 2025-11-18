import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallLegalHoldTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldTarget";

/**
 * Validate that an authenticated admin can update mutable metadata fields of a
 * legal hold target without altering immutable linkage fields.
 *
 * Business context:
 *
 * - Legal holds are created and managed by admins to preserve data for
 *   compliance/investigation.
 * - Each legal hold can have multiple targets (e.g., customer, order) attached
 *   via legal hold targets.
 * - For a given target, linkage fields (id, shopping_mall_legal_hold_id,
 *   target_type, target_id, created_at) must remain immutable once created,
 *   while descriptive metadata (note, target_display) can be updated.
 *
 * Test steps:
 *
 * 1. Register a new admin via POST /auth/admin/join and obtain an authenticated
 *    admin context.
 * 2. Create a legal hold via POST /shoppingMall/admin/legalHolds.
 * 3. Under that legal hold, create a legal hold target via POST
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets with initial note
 *    and target_display.
 * 4. Update the target via PUT
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets/{legalHoldTargetId}
 *    with new note and target_display values.
 * 5. Verify that:
 *
 *    - Note and target_display are updated to the new values.
 *    - Immutable fields id, shopping_mall_legal_hold_id, target_type, target_id,
 *         created_at remain unchanged.
 */
export async function test_api_legal_hold_target_metadata_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication context)
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

  // 2. Create a legal hold
  const legalHoldBody = {
    code: RandomGenerator.alphaNumeric(16),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldBody,
    });
  typia.assert(legalHold);

  // 3. Create a legal hold target under that legal hold
  const initialTargetDisplay = RandomGenerator.paragraph({ sentences: 2 });
  const initialNote = RandomGenerator.paragraph({ sentences: 3 });

  const createTargetBody = {
    target_type: "customer", // arbitrary business label
    target_id: typia.random<string & tags.Format<"uuid">>(),
    target_display: initialTargetDisplay,
    note: initialNote,
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const originalTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode: legalHold.code,
        body: createTargetBody,
      },
    );
  typia.assert(originalTarget);

  // Basic linkage sanity: target is attached to the created legal hold
  TestValidator.equals(
    "target is linked to the created legal hold",
    originalTarget.shopping_mall_legal_hold_id,
    legalHold.id,
  );

  // 4. Update target metadata (note, target_display)
  const updatedNote = RandomGenerator.paragraph({ sentences: 4 });
  const updatedTargetDisplay = RandomGenerator.paragraph({ sentences: 2 });

  const updateBody = {
    note: updatedNote,
    target_display: updatedTargetDisplay,
  } satisfies IShoppingMallLegalHoldTarget.IUpdate;

  const updatedTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.update(
      connection,
      {
        legalHoldCode: legalHold.code,
        legalHoldTargetId: originalTarget.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTarget);

  // 5. Assertions
  // 5-1. Mutable metadata should be updated
  TestValidator.equals(
    "note should be updated to new value",
    updatedTarget.note,
    updatedNote,
  );
  TestValidator.equals(
    "target_display should be updated to new value",
    updatedTarget.target_display,
    updatedTargetDisplay,
  );

  // Ensure the values actually changed from the original ones
  TestValidator.notEquals(
    "note should differ from original",
    updatedTarget.note,
    originalTarget.note,
  );
  TestValidator.notEquals(
    "target_display should differ from original",
    updatedTarget.target_display,
    originalTarget.target_display,
  );

  // 5-2. Immutable linkage fields must remain unchanged
  TestValidator.equals(
    "id should remain unchanged",
    updatedTarget.id,
    originalTarget.id,
  );
  TestValidator.equals(
    "shopping_mall_legal_hold_id should remain unchanged",
    updatedTarget.shopping_mall_legal_hold_id,
    originalTarget.shopping_mall_legal_hold_id,
  );
  TestValidator.equals(
    "shopping_mall_legal_hold_id should still match parent legal hold id",
    updatedTarget.shopping_mall_legal_hold_id,
    legalHold.id,
  );
  TestValidator.equals(
    "target_type should remain unchanged",
    updatedTarget.target_type,
    originalTarget.target_type,
  );
  TestValidator.equals(
    "target_id should remain unchanged",
    updatedTarget.target_id,
    originalTarget.target_id,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedTarget.created_at,
    originalTarget.created_at,
  );
}
