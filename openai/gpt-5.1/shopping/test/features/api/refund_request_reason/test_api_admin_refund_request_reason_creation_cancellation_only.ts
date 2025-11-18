import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Verify that an authenticated admin can create a cancellation-only refund
 * request reason and that applicability flags are persisted correctly.
 *
 * Business context: Operations/governance teams manage a catalog of
 * standardized refund/cancellation reasons that drive downstream flows and
 * reporting. Some reasons should be usable only in pre-fulfillment cancellation
 * flows (applies_to_cancellation = true, applies_to_refund = false), while
 * others may be used for post-fulfillment refunds. This test ensures that when
 * an admin configures a cancellation-only reason, the backend preserves and
 * returns those applicability flags exactly as requested.
 *
 * Steps:
 *
 * 1. Register a new admin via POST /auth/admin/join to obtain an authorized admin
 *    context.
 * 2. Using that context, create a new refund request reason via POST
 *    /shoppingMall/admin/refundRequestReasons with:
 *
 *    - Code: unique machine-friendly test code
 *    - Name: descriptive label
 *    - Description: text explaining that this is a cancellation-only reason
 *    - Applies_to_cancellation = true
 *    - Applies_to_refund = false
 *    - Is_active = true
 * 3. Assert that the API responds with an IShoppingMallRefundRequestReason whose
 *    fields match the input where applicable and that flags/timestamps are
 *    valid:
 *
 *    - Applies_to_cancellation === true
 *    - Applies_to_refund === false
 *    - Is_active === true
 *    - Code and name equal the request body
 *    - Description is preserved
 *    - Created_at and updated_at are valid date-time strings (via typia.assert).
 */
export async function test_api_admin_refund_request_reason_creation_cancellation_only(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain authorized context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare cancellation-only refund request reason payload
  const reasonCode = `test_cancel_only_${RandomGenerator.alphaNumeric(8)}`;
  const reasonName =
    "Cancellation only - customer changed mind before shipment";
  const reasonDescription =
    "Reason applicable only to order cancellations before fulfillment; not valid for refunds.";

  const createBody = {
    code: reasonCode,
    name: reasonName,
    description: reasonDescription,
    applies_to_cancellation: true,
    applies_to_refund: false,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  const createdReason: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallRefundRequestReason>(createdReason);

  // 3. Business assertions on flags and key fields
  TestValidator.equals(
    "applies_to_cancellation should be true for cancellation-only reason",
    createdReason.applies_to_cancellation,
    true,
  );
  TestValidator.equals(
    "applies_to_refund should be false for cancellation-only reason",
    createdReason.applies_to_refund,
    false,
  );
  TestValidator.equals(
    "is_active should be true for newly created active reason",
    createdReason.is_active,
    true,
  );

  TestValidator.equals(
    "reason code in response should match request body",
    createdReason.code,
    reasonCode,
  );
  TestValidator.equals(
    "reason name in response should match request body",
    createdReason.name,
    reasonName,
  );
  TestValidator.equals(
    "reason description in response should match request body",
    createdReason.description,
    reasonDescription,
  );

  // created_at and updated_at are fully validated by typia.assert via date-time format tags,
  // so no additional format checks are needed here.
}
