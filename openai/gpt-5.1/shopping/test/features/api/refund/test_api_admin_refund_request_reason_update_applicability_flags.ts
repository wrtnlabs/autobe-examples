import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Validate that an admin can update applicability flags of an existing refund
 * request reason without changing its identity.
 *
 * Business goal:
 *
 * - Demonstrate that applies_to_cancellation and applies_to_refund can be
 *   reconfigured for an existing IShoppingMallRefundRequestReason while the
 *   business key `code` and primary key `id` remain stable.
 *
 * Flow:
 *
 * 1. Join as an admin using POST /auth/admin/join to obtain authenticated admin
 *    context.
 * 2. Create a baseline refund request reason via POST
 *    /shoppingMall/admin/refundRequestReasons with
 *    IShoppingMallRefundRequestReason.ICreate where both
 *    applies_to_cancellation and applies_to_refund are true.
 * 3. Call PUT /shoppingMall/admin/refundRequestReasons/{reasonCode} using
 *    api.functional.shoppingMall.admin.refundRequestReasons.update with
 *    reasonCode equal to the created reason.code and body of type
 *    IShoppingMallRefundRequestReason.IUpdate to switch to cancellation-only
 *    applicability (applies_to_cancellation: true, applies_to_refund: false).
 * 4. Assert response integrity:
 *
 *    - Typia.assert on the returned IShoppingMallRefundRequestReason
 *    - Id is unchanged from before the update
 *    - Code is unchanged and matches the path reasonCode used
 *    - Applies_to_cancellation === true
 *    - Applies_to_refund === false
 *    - Created_at is unchanged
 *    - Updated_at has changed (not equal to original updated_at)
 *
 * This ensures applicability flags are mutable while the business key and
 * identity remain immutable and controlled by the path parameter.
 */
export async function test_api_admin_refund_request_reason_update_applicability_flags(
  connection: api.IConnection,
) {
  // 1. Admin join to get authenticated admin context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create baseline refund request reason with both flags true
  const createBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
    applies_to_cancellation: true,
    applies_to_refund: true,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  const original: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      { body: createBody },
    );
  typia.assert(original);

  // 3. Update the applicability flags to cancellation-only via PUT
  const updateBody = {
    applies_to_cancellation: true,
    applies_to_refund: false,
  } satisfies IShoppingMallRefundRequestReason.IUpdate;

  const updated: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.update(
      connection,
      {
        reasonCode: original.code,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Business assertions
  // Identity must remain stable
  TestValidator.equals(
    "refund reason id must remain unchanged after applicability update",
    updated.id,
    original.id,
  );
  TestValidator.equals(
    "refund reason code must remain unchanged and match path reasonCode",
    updated.code,
    original.code,
  );

  // Applicability flags should reflect new configuration
  TestValidator.equals(
    "applies_to_cancellation must be true after update",
    updated.applies_to_cancellation,
    true,
  );
  TestValidator.equals(
    "applies_to_refund must be false after update",
    updated.applies_to_refund,
    false,
  );

  // created_at should be unchanged; updated_at should be refreshed
  TestValidator.equals(
    "created_at must remain unchanged after update",
    updated.created_at,
    original.created_at,
  );
  TestValidator.notEquals(
    "updated_at must be changed after applicability update",
    updated.updated_at,
    original.updated_at,
  );
}
