import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Validate admin deletion behavior for refund request reasons.
 *
 * Business intent: Ensure that when an administrator deletes a refund request
 * reason by its business code, the catalog no longer treats that code as an
 * existing configuration entry for further deletion operations, while other,
 * unrelated reasons continue to behave normally.
 *
 * Because listing/search and refund-request creation APIs are not available in
 * this context, we approximate "visibility in lists" and "non-selectability for
 * new flows" by verifying that:
 *
 * - A newly created refund request reason is correctly returned from the create
 *   call.
 * - Deleting that reason by its business code succeeds once.
 * - A second deletion attempt on the same reason code fails with an error,
 *   demonstrating that the system no longer recognizes it as a deletable
 *   catalog entry.
 * - Another, distinct reason can still be created and deleted successfully,
 *   proving that deletion is scoped to the targeted code and does not affect
 *   unrelated reasons.
 *
 * High-level steps:
 *
 * 1. Admin registration
 *
 *    - Call POST /auth/admin/join with a random IShoppingMallAdminJoin.ICreate
 *         payload.
 *    - Assert the returned IShoppingMallAdmin.IAuthorized.
 *    - Rely on the SDK to set the Authorization header on the connection.
 * 2. Create first active refund request reason
 *
 *    - Construct a deterministic, unique business code string.
 *    - Build an IShoppingMallRefundRequestReason.ICreate body with that code,
 *         human-readable name and description, applicability flags, and
 *         is_active set to true.
 *    - Call POST /shoppingMall/admin/refundRequestReasons.
 *    - Assert the returned IShoppingMallRefundRequestReason and verify that the code
 *         and is_active fields match expectations.
 * 3. Create a second active refund request reason
 *
 *    - Repeat creation with a different business code.
 *    - Assert the response and verify that its code differs from the first reason's
 *         code so we can later confirm deletion scoping.
 * 4. Delete the first reason by its code
 *
 *    - Call DELETE /shoppingMall/admin/refundRequestReasons/{reasonCode} with the
 *         first code.
 *    - This should succeed without throwing.
 * 5. Verify deletion effect via error on second delete
 *
 *    - Use TestValidator.error with an async closure that calls erase again with the
 *         same reasonCode.
 *    - Expect an error to be thrown, indicating that the system no longer recognizes
 *         that reasonCode as a valid deletion target, which we interpret as the
 *         reason having been fully removed from the catalog.
 * 6. Confirm other reasons remain unaffected
 *
 *    - Call erase once on the second reason's code and expect success without error,
 *         demonstrating that unrelated codes are still valid and can be
 *         independently deleted.
 */
export async function test_api_admin_refund_reason_delete_visibility_in_lists(
  connection: api.IConnection,
) {
  // 1. Admin registration via POST /auth/admin/join
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create the first active refund request reason
  const reasonCode1 = `autobe_test_reason_${RandomGenerator.alphaNumeric(8)}`;

  let appliesToCancellation1 = true;
  let appliesToRefund1 = true;
  // Make sure at least one of the applicability flags is true
  const randomFlag1 = RandomGenerator.pick([true, false] as const);
  const randomFlag2 = RandomGenerator.pick([true, false] as const);
  appliesToCancellation1 = randomFlag1;
  appliesToRefund1 = randomFlag2;
  if (!appliesToCancellation1 && !appliesToRefund1) {
    // Ensure the reason is usable in at least one workflow
    appliesToRefund1 = true;
  }

  const createBody1 = {
    code: reasonCode1,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    applies_to_cancellation: appliesToCancellation1,
    applies_to_refund: appliesToRefund1,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  const reason1: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: createBody1,
      },
    );
  typia.assert(reason1);

  // Basic field validations for the first reason
  TestValidator.equals(
    "created refund reason 1 code should match request code",
    reason1.code,
    reasonCode1,
  );
  TestValidator.equals(
    "created refund reason 1 is_active should be true",
    reason1.is_active,
    true,
  );

  // 3. Create a second active refund request reason for scoping verification
  const reasonCode2 = `autobe_test_reason_${RandomGenerator.alphaNumeric(8)}`;

  let appliesToCancellation2 = true;
  let appliesToRefund2 = true;
  const randomFlag3 = RandomGenerator.pick([true, false] as const);
  const randomFlag4 = RandomGenerator.pick([true, false] as const);
  appliesToCancellation2 = randomFlag3;
  appliesToRefund2 = randomFlag4;
  if (!appliesToCancellation2 && !appliesToRefund2) {
    appliesToRefund2 = true;
  }

  const createBody2 = {
    code: reasonCode2,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    applies_to_cancellation: appliesToCancellation2,
    applies_to_refund: appliesToRefund2,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  const reason2: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: createBody2,
      },
    );
  typia.assert(reason2);

  TestValidator.notEquals(
    "codes of first and second refund reasons should differ",
    reason1.code,
    reason2.code,
  );

  // 4. Delete the first reason by its code (should succeed)
  await api.functional.shoppingMall.admin.refundRequestReasons.erase(
    connection,
    {
      reasonCode: reasonCode1,
    },
  );

  // 5. Second deletion attempt on the same code should fail
  await TestValidator.error(
    "second deletion of the same refund reason code should fail",
    async () => {
      await api.functional.shoppingMall.admin.refundRequestReasons.erase(
        connection,
        {
          reasonCode: reasonCode1,
        },
      );
    },
  );

  // 6. Delete the second reason once to confirm unrelated codes still work
  await api.functional.shoppingMall.admin.refundRequestReasons.erase(
    connection,
    {
      reasonCode: reasonCode2,
    },
  );
}
