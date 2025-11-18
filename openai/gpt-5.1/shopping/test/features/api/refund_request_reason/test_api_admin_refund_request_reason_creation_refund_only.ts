import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Validate creation of a refund-only refund request reason by an admin.
 *
 * Business goal: Ensure that administrative configuration can define refund
 * request reasons that apply exclusively to refund flows (not cancellations),
 * and that the backend persists the applicability flags exactly as provided
 * without enforcing symmetry between cancellation and refund applicability.
 *
 * Scenario steps:
 *
 * 1. Register a new admin via POST /auth/admin/join to obtain an authorized admin
 *    context (Authorization header is handled automatically by SDK).
 * 2. As that admin, call POST /shoppingMall/admin/refundRequestReasons with an
 *    IShoppingMallRefundRequestReason.ICreate payload where:
 *
 *    - Applies_to_cancellation = false
 *    - Applies_to_refund = true
 *    - Is_active = true
 *    - Code is a unique machine-friendly identifier
 *    - Name is a human-readable label
 *    - Description optionally explains refund-only semantics
 * 3. Assert that the API responds with a valid IShoppingMallRefundRequestReason
 *    instance and that the returned flags match the intended configuration
 *    exactly.
 * 4. Optionally, perform an additional create call for a symmetric reason (both
 *    flags true) to contrast behavior and ensure the system supports both
 *    patterns. However, primary assertion is that refund-only is supported and
 *    persisted.
 */
export async function test_api_admin_refund_request_reason_creation_refund_only(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a refund-only refund request reason
  const reasonCreateBody = {
    code: `refund_only_${RandomGenerator.alphaNumeric(12)}`,
    name: "Refund only - item defective after shipping",
    description:
      "Reason applicable only to refund requests when an item is defective after shipment, not for pre-shipment cancellations.",
    applies_to_cancellation: false,
    applies_to_refund: true,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  const createdReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: reasonCreateBody,
      },
    );
  typia.assert<IShoppingMallRefundRequestReason>(createdReason);

  // 3. Validate that flags and core fields are persisted correctly
  TestValidator.equals(
    "refund-only reason: applies_to_cancellation should be false",
    createdReason.applies_to_cancellation,
    false,
  );
  TestValidator.equals(
    "refund-only reason: applies_to_refund should be true",
    createdReason.applies_to_refund,
    true,
  );
  TestValidator.equals(
    "refund-only reason: is_active should be true",
    createdReason.is_active,
    true,
  );

  TestValidator.equals(
    "refund-only reason: code should match request payload",
    createdReason.code,
    reasonCreateBody.code,
  );
  TestValidator.equals(
    "refund-only reason: name should match request payload",
    createdReason.name,
    reasonCreateBody.name,
  );
  TestValidator.equals(
    "refund-only reason: description should match request payload",
    createdReason.description ?? null,
    reasonCreateBody.description ?? null,
  );
}
