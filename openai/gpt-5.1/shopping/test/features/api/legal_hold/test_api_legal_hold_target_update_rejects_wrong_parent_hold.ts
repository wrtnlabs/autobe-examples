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
 * Validate that a legal hold target remains bound to its original legal hold
 * and that attempting to update it via a different legal hold code fails.
 *
 * Business context:
 *
 * - Legal holds are governance constructs that must have stable scopes.
 * - Each target row is attached to a single legal hold via a foreign key and must
 *   not be re-parented between holds by changing path parameters.
 *
 * Scenario implemented:
 *
 * 1. Admin joins (POST /auth/admin/join) to obtain an authorized context.
 * 2. Admin creates two legal holds via POST /shoppingMall/admin/legalHolds with
 *    distinct business codes HOLD-A and HOLD-B.
 * 3. Under HOLD-A, admin creates a legal hold target using POST
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets.
 * 4. Admin performs a valid update against that target using the correct parent
 *    code HOLD-A and verifies that editable metadata is changed.
 * 5. Admin attempts to update the same target via HOLD-B using PUT
 *    /shoppingMall/admin/legalHolds/{HOLD-B}/targets/{targetId} and verifies
 *    that the call results in an error (runtime business error), proving that
 *    the target cannot be updated under a different parent hold.
 * 6. Admin performs a second successful update via HOLD-A to demonstrate that the
 *    target remains consistently bound to its original legal hold and can
 *    continue to be updated through that parent only.
 */
export async function test_api_legal_hold_target_update_rejects_wrong_parent_hold(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/legal-hold-setup",
    referrer: "https://admin.shoppingmall.test/dashboard",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create two legal holds with distinct business codes
  const holdACode = `HOLD-A-${RandomGenerator.alphaNumeric(8)}`;
  const holdBCode = `HOLD-B-${RandomGenerator.alphaNumeric(8)}`;

  const holdABody = {
    code: holdACode,
    title: `Legal Hold A ${RandomGenerator.paragraph({ sentences: 1 })}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 2 }),
    external_reference: null,
    effective_from: null,
  } satisfies IShoppingMallLegalHold.ICreate;

  const holdA = await api.functional.shoppingMall.admin.legalHolds.create(
    connection,
    { body: holdABody },
  );
  typia.assert<IShoppingMallLegalHold>(holdA);
  TestValidator.equals(
    "created legal hold A uses requested code",
    holdA.code,
    holdACode,
  );

  const holdBBody = {
    code: holdBCode,
    title: `Legal Hold B ${RandomGenerator.paragraph({ sentences: 1 })}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    scope_description: null,
    external_reference: null,
    effective_from: null,
  } satisfies IShoppingMallLegalHold.ICreate;

  const holdB = await api.functional.shoppingMall.admin.legalHolds.create(
    connection,
    { body: holdBBody },
  );
  typia.assert<IShoppingMallLegalHold>(holdB);
  TestValidator.equals(
    "created legal hold B uses requested code",
    holdB.code,
    holdBCode,
  );

  // 3. Create a legal hold target under HOLD-A
  const initialTargetBody = {
    target_type: "order",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    target_display: RandomGenerator.paragraph({ sentences: 1 }),
    note: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const initialTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode: holdACode,
        body: initialTargetBody,
      },
    );
  typia.assert<IShoppingMallLegalHoldTarget>(initialTarget);

  // Snapshot original editable metadata for comparison
  const originalNote = initialTarget.note ?? null;
  const originalDisplay = initialTarget.target_display ?? null;

  // 4. First update via the correct parent code (HOLD-A)
  const firstUpdateBody = {
    note: RandomGenerator.paragraph({ sentences: 2 }),
    target_display: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallLegalHoldTarget.IUpdate;

  const updatedOnce =
    await api.functional.shoppingMall.admin.legalHolds.targets.update(
      connection,
      {
        legalHoldCode: holdACode,
        legalHoldTargetId: initialTarget.id,
        body: firstUpdateBody,
      },
    );
  typia.assert<IShoppingMallLegalHoldTarget>(updatedOnce);

  TestValidator.equals(
    "target id remains stable after first update",
    updatedOnce.id,
    initialTarget.id,
  );
  TestValidator.equals(
    "note changed on first update",
    updatedOnce.note ?? null,
    firstUpdateBody.note ?? null,
  );
  TestValidator.notEquals(
    "note after first update differs from original (when both non-null)",
    updatedOnce.note ?? null,
    originalNote,
  );
  TestValidator.equals(
    "target_display changed on first update",
    updatedOnce.target_display ?? null,
    firstUpdateBody.target_display ?? null,
  );
  TestValidator.notEquals(
    "target_display after first update differs from original (when both non-null)",
    updatedOnce.target_display ?? null,
    originalDisplay,
  );

  // 5. Attempt to update the same target under a different legal hold code (HOLD-B)
  const wrongParentUpdateBody = {
    note: RandomGenerator.paragraph({ sentences: 1 }),
    target_display: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallLegalHoldTarget.IUpdate;

  await TestValidator.error(
    "updating target under wrong legal hold code must fail",
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.targets.update(
        connection,
        {
          legalHoldCode: holdBCode,
          legalHoldTargetId: initialTarget.id,
          body: wrongParentUpdateBody,
        },
      );
    },
  );

  // 6. Second update via the same parent code (HOLD-A) to prove stable binding
  const secondUpdateBody = {
    note: RandomGenerator.paragraph({ sentences: 1 }),
    target_display: null,
  } satisfies IShoppingMallLegalHoldTarget.IUpdate;

  const updatedTwice =
    await api.functional.shoppingMall.admin.legalHolds.targets.update(
      connection,
      {
        legalHoldCode: holdACode,
        legalHoldTargetId: initialTarget.id,
        body: secondUpdateBody,
      },
    );
  typia.assert<IShoppingMallLegalHoldTarget>(updatedTwice);

  TestValidator.equals(
    "target id remains stable after second update",
    updatedTwice.id,
    initialTarget.id,
  );
  TestValidator.equals(
    "note reflects second update",
    updatedTwice.note ?? null,
    secondUpdateBody.note ?? null,
  );
  TestValidator.notEquals(
    "note after second update differs from first update",
    updatedTwice.note ?? null,
    updatedOnce.note ?? null,
  );
  TestValidator.equals(
    "target_display can be cleared to null on second update",
    updatedTwice.target_display ?? null,
    secondUpdateBody.target_display ?? null,
  );

  // Business invariant check: we have a distinct legal hold B in the system,
  // but the only successful update path for this target id used HOLD-A. The
  // attempt via HOLD-B failed, demonstrating that the target remains scoped to
  // its original legal hold and cannot be re-parented by changing the path
  // legalHoldCode.
  TestValidator.predicate(
    "legal hold A and B have distinct business codes",
    holdA.code !== holdB.code,
  );
}
