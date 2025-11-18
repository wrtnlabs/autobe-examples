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
 * Verify that optional descriptive metadata on a legal hold target can be
 * cleared.
 *
 * Business goal:
 *
 * - Ensure an admin can update an existing legal hold target so that optional
 *   field `target_display` is explicitly set to null, while linkage and
 *   identity fields remain unchanged and `note` remains intact according to the
 *   schema.
 *
 * Test process:
 *
 * 1. Register an admin using POST /auth/admin/join to obtain an authenticated
 *    context.
 * 2. Create a legal hold via POST /shoppingMall/admin/legalHolds.
 * 3. Create a legal hold target under that hold via POST
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets with non-null
 *    `target_display` and `note`.
 * 4. Call PUT
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets/{legalHoldTargetId}
 *    with IShoppingMallLegalHoldTarget.IUpdate where `target_display` is set to
 *    null.
 * 5. Validate the response:
 *
 *    - `target_display` is null.
 *    - `note` is unchanged from its original value.
 *    - `id`, `shopping_mall_legal_hold_id`, `target_type`, and `target_id` are
 *         unchanged.
 *
 * There is no separate GET endpoint in the provided SDK for reading a single
 * target, so persistence is validated via the update response itself.
 */
export async function test_api_legal_hold_target_update_clears_optional_fields(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain authenticated admin context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a legal hold as this admin.
  const legalHoldBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
    status: "active",
    scope_description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    external_reference: RandomGenerator.alphaNumeric(16),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldBody,
    });
  typia.assert(legalHold);

  // 3. Create a legal hold target under that legal hold with non-null metadata.
  const targetId = typia.random<string & tags.Format<"uuid">>();
  const targetCreateBody = {
    target_type: "customer",
    target_id: targetId,
    target_display: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    note: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const createdTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode: legalHold.code,
        body: targetCreateBody,
      },
    );
  typia.assert(createdTarget);

  // Capture immutable and baseline fields to verify they stay unchanged after update.
  const originalId = createdTarget.id;
  const originalHoldId = createdTarget.shopping_mall_legal_hold_id;
  const originalTargetType = createdTarget.target_type;
  const originalTargetEntityId = createdTarget.target_id;
  const originalNote = createdTarget.note;

  // Sanity check: target_display and note should be non-null before update.
  TestValidator.predicate(
    "initial target_display should be non-null",
    createdTarget.target_display !== null &&
      createdTarget.target_display !== undefined &&
      createdTarget.target_display.length > 0,
  );
  TestValidator.predicate(
    "initial note should be non-null",
    createdTarget.note !== null &&
      createdTarget.note !== undefined &&
      createdTarget.note.length > 0,
  );

  // 4. Update the target, explicitly clearing the target_display field.
  const updateBody = {
    target_display: null,
  } satisfies IShoppingMallLegalHoldTarget.IUpdate;

  const updatedTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.update(
      connection,
      {
        legalHoldCode: legalHold.code,
        legalHoldTargetId: createdTarget.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTarget);

  // 5. Validate that target_display is cleared and other fields are unchanged.
  TestValidator.equals(
    "target_display is cleared to null",
    updatedTarget.target_display,
    null,
  );

  TestValidator.equals(
    "id remains unchanged after update",
    updatedTarget.id,
    originalId,
  );
  TestValidator.equals(
    "shopping_mall_legal_hold_id remains unchanged",
    updatedTarget.shopping_mall_legal_hold_id,
    originalHoldId,
  );
  TestValidator.equals(
    "target_type remains unchanged",
    updatedTarget.target_type,
    originalTargetType,
  );
  TestValidator.equals(
    "target_id remains unchanged",
    updatedTarget.target_id,
    originalTargetEntityId,
  );

  TestValidator.equals(
    "note remains unchanged when not included in update",
    updatedTarget.note,
    originalNote,
  );
}
