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
 * Verify that updating a legal hold target requires admin authentication.
 *
 * Business goal: Ensure that sensitive legal hold target metadata (note,
 * target_display) can only be modified by authenticated administrative actors,
 * and that attempts without admin authentication are rejected and cannot alter
 * stored data.
 *
 * Scenario steps:
 *
 * 1. Register an admin via POST /auth/admin/join, which also establishes an
 *    authenticated admin connection through the SDK.
 * 2. Using this admin connection, create a legal hold via POST
 *    /shoppingMall/admin/legalHolds with a deterministic, unique code so we can
 *    later reference it.
 * 3. Under that legal hold, create a legal hold target via POST
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets and capture the
 *    returned target including note and target_display.
 * 4. Prepare an unauthenticated connection object by shallow-cloning the original
 *    connection and overriding headers with an empty object at creation time
 *    (no further header manipulation). Use this unauthenticated connection to
 *    call PUT
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets/{legalHoldTargetId}
 *    with a valid IShoppingMallLegalHoldTarget.IUpdate payload, and wrap the
 *    call in TestValidator.error to assert that it fails due to missing admin
 *    auth. We do not inspect concrete HTTP status codes, only that an error is
 *    thrown.
 * 5. After the failed call, invoke another authenticated update using the original
 *    admin-authenticated connection, passing a different
 *    IShoppingMallLegalHoldTarget.IUpdate payload that changes both note and
 *    target_display.
 * 6. Assert that the successful authenticated update returns an
 *    IShoppingMallLegalHoldTarget whose note and target_display match the
 *    second payload, and that we can observe a difference relative to the
 *    original target state.
 *
 * Implementation notes:
 *
 * - Use typia.random with proper generic parameters to generate compliant
 *   IShoppingMallAdminJoin.ICreate, IShoppingMallLegalHold.ICreate, and
 *   IShoppingMallLegalHoldTarget.ICreate payloads.
 * - Construct IShoppingMallLegalHoldTarget.IUpdate objects explicitly with
 *   concrete strings to clearly compare old vs new metadata.
 * - Do not touch connection.headers directly anywhere in the test; for the
 *   unauthenticated attempt, create a separate IConnection instance via shallow
 *   cloning and inline `headers: {}` in the object literal.
 * - Use typia.assert on all successful API responses to guarantee structural
 *   correctness.
 * - Use TestValidator.error with `await` and an async callback for the
 *   unauthenticated update attempt, and avoid validating HTTP status codes or
 *   error messages.
 */
export async function test_api_legal_hold_target_update_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register an admin and get authenticated admin context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a legal hold under this admin
  const legalHoldCreateBody = typia.random<IShoppingMallLegalHold.ICreate>();

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldCreateBody,
    });
  typia.assert(legalHold);

  // 3. Create a legal hold target for the created hold
  const targetCreateBody = typia.random<IShoppingMallLegalHoldTarget.ICreate>();

  const createdTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode: legalHold.code,
        body: targetCreateBody,
      },
    );
  typia.assert(createdTarget);

  // Capture original metadata for later comparison
  const originalNote: string | null | undefined = createdTarget.note;
  const originalDisplay: string | null | undefined =
    createdTarget.target_display;

  // 4. Attempt unauthenticated update using a cloned connection with empty headers
  const unauthenticatedConnection: IConnection = {
    ...connection,
    headers: {},
  };

  const unauthUpdateBody: IShoppingMallLegalHoldTarget.IUpdate = {
    note: "unauthenticated update attempt",
    target_display: "UNAUTH_DISPLAY",
  };

  await TestValidator.error(
    "unauthenticated admin update must fail",
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.targets.update(
        unauthenticatedConnection,
        {
          legalHoldCode: legalHold.code,
          legalHoldTargetId: createdTarget.id,
          body: unauthUpdateBody,
        },
      );
    },
  );

  // 5. Perform authenticated update as the admin with different metadata
  const authUpdateBody: IShoppingMallLegalHoldTarget.IUpdate = {
    note: "authenticated admin note",
    target_display: "AUTH_DISPLAY",
  };

  const updatedTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.update(
      connection,
      {
        legalHoldCode: legalHold.code,
        legalHoldTargetId: createdTarget.id,
        body: authUpdateBody,
      },
    );
  typia.assert(updatedTarget);

  // 6. Validate that metadata was not changed by unauthenticated attempt but
  // is updated by authenticated update.
  // We cannot re-fetch after unauth attempt without a GET API, so we assert
  // only on the final updatedTarget and compare to original values.

  TestValidator.equals(
    "authenticated update should apply new note",
    updatedTarget.note ?? null,
    authUpdateBody.note ?? null,
  );

  TestValidator.equals(
    "authenticated update should apply new target_display",
    updatedTarget.target_display ?? null,
    authUpdateBody.target_display ?? null,
  );

  // Additionally confirm that at least one of the updated fields differs from
  // the original metadata, demonstrating state change only after authenticated
  // call.
  const noteChanged: boolean = updatedTarget.note !== originalNote;
  const displayChanged: boolean =
    updatedTarget.target_display !== originalDisplay;

  TestValidator.predicate(
    "at least one metadata field (note or target_display) must change after authenticated update",
    noteChanged || displayChanged,
  );
}
