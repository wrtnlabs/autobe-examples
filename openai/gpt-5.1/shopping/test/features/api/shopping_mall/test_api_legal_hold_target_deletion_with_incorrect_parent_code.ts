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
 * Validate that deleting a legal hold target with an incorrect parent
 * legalHoldCode is rejected, and the target remains deletable under its correct
 * parent.
 *
 * Business workflow:
 *
 * 1. Register an admin (join) to obtain authorization for legal hold operations.
 * 2. Create two distinct legal holds (HOLD-ONE and HOLD-TWO).
 * 3. Under HOLD-ONE, create a single legal hold target.
 * 4. Attempt to delete the target using HOLD-TWO as the legalHoldCode while still
 *    specifying the target id belonging to HOLD-ONE; this must fail.
 * 5. Then delete the same target correctly under HOLD-ONE and verify that this
 *    succeeds, demonstrating that the failed mismatched deletion did not remove
 *    the record.
 */
export async function test_api_legal_hold_target_deletion_with_incorrect_parent_code(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);

  // 2. Create two distinct legal holds
  const holdOneCode = `HOLD-ONE-${RandomGenerator.alphaNumeric(6)}`;
  const holdTwoCode = `HOLD-TWO-${RandomGenerator.alphaNumeric(6)}`;

  const holdOneBody = {
    code: holdOneCode,
    title: "Legal Hold One for mismatch deletion test",
    description: null,
    status: "active",
    scope_description: null,
    external_reference: null,
    effective_from: null,
  } satisfies IShoppingMallLegalHold.ICreate;

  const holdTwoBody = {
    code: holdTwoCode,
    title: "Legal Hold Two for mismatch deletion test",
    description: null,
    status: "active",
    scope_description: null,
    external_reference: null,
    effective_from: null,
  } satisfies IShoppingMallLegalHold.ICreate;

  const holdOne: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: holdOneBody,
    });
  typia.assert(holdOne);

  const holdTwo: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: holdTwoBody,
    });
  typia.assert(holdTwo);

  // Basic sanity: holds are distinct
  TestValidator.notEquals(
    "legal hold ids must be distinct",
    holdOne.id,
    holdTwo.id,
  );
  TestValidator.notEquals(
    "legal hold codes must be distinct",
    holdOne.code,
    holdTwo.code,
  );

  TestValidator.equals(
    "holdOne code should match request body",
    holdOne.code,
    holdOneCode,
  );
  TestValidator.equals(
    "holdTwo code should match request body",
    holdTwo.code,
    holdTwoCode,
  );

  // 3. Create a legal hold target under HOLD-ONE
  const targetBody = {
    target_type: "order",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    target_display: "Order under legal hold one",
    note: "Target used for mismatched deletion test",
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const target: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode: holdOne.code,
        body: targetBody,
      },
    );
  typia.assert(target);

  // Sanity: target is associated with the correct legal hold
  TestValidator.equals(
    "target's parent legal hold id should match holdOne.id",
    target.shopping_mall_legal_hold_id,
    holdOne.id,
  );

  // 4. Attempt mismatched deletion using HOLD-TWO with HOLD-ONE's target id
  await TestValidator.error(
    "deleting target with mismatched legalHoldCode should fail",
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.targets.erase(
        connection,
        {
          legalHoldCode: holdTwo.code,
          legalHoldTargetId: target.id,
        },
      );
    },
  );

  // 5. Correctly delete the target under HOLD-ONE; this should succeed
  await api.functional.shoppingMall.admin.legalHolds.targets.erase(connection, {
    legalHoldCode: holdOne.code,
    legalHoldTargetId: target.id,
  });
}
