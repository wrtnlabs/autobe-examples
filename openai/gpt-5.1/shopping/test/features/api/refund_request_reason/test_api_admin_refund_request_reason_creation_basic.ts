import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Basic happy-path test for creating an admin refund request reason
 * configuration.
 *
 * Business purpose:
 *
 * - Ensure that a freshly joined administrator can create a new refund request
 *   reason configuration via the admin-facing endpoint.
 * - Verify that the backend persists and returns the configuration using the
 *   `IShoppingMallRefundRequestReason` schema, echoing back all supplied
 *   business fields and populating system fields such as `id`, `created_at`,
 *   and `updated_at`.
 *
 * High-level steps:
 *
 * 1. Register a new admin using POST /auth/admin/join to obtain an authenticated
 *    admin context.
 * 2. Using that authenticated context, call POST
 *    /shoppingMall/admin/refundRequestReasons with a well-formed
 *    `IShoppingMallRefundRequestReason.ICreate` payload.
 * 3. Assert the response type and verify that key business fields (code, name,
 *    description, applicability flags, activation flag) match the request.
 * 4. Perform basic sanity checks on system-managed fields such as `id` and
 *    timestamps.
 */
export async function test_api_admin_refund_request_reason_creation_basic(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  // Use typia.random to generate a valid IShoppingMallAdminJoin.ICreate payload
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  // Validate the authorized admin structure and token via typia
  typia.assert(adminAuthorized);

  // 2. Prepare refund request reason creation payload
  const reasonCode: string = `auto_e2e_${RandomGenerator.alphaNumeric(12)}`;
  const reasonName: string = RandomGenerator.paragraph({
    sentences: 3,
  });
  const reasonDescription: string = RandomGenerator.paragraph({
    sentences: 6,
  });

  const appliesToCancellation = true;
  const appliesToRefund = true;
  const isActive = true;

  const createBody = {
    code: reasonCode,
    name: reasonName,
    description: reasonDescription,
    applies_to_cancellation: appliesToCancellation,
    applies_to_refund: appliesToRefund,
    is_active: isActive,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  // 3. Create refund request reason via admin API
  const createdReason: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: createBody,
      },
    );

  // Type-level validation of the created reason
  typia.assert(createdReason);

  // 4. Business field round-trip assertions
  TestValidator.equals(
    "refund reason code should round-trip from request to response",
    createdReason.code,
    reasonCode,
  );

  TestValidator.equals(
    "refund reason name should match the requested name",
    createdReason.name,
    reasonName,
  );

  TestValidator.equals(
    "refund reason description should match the requested description",
    createdReason.description,
    reasonDescription,
  );

  TestValidator.equals(
    "applies_to_cancellation flag should match requested value",
    createdReason.applies_to_cancellation,
    appliesToCancellation,
  );

  TestValidator.equals(
    "applies_to_refund flag should match requested value",
    createdReason.applies_to_refund,
    appliesToRefund,
  );

  TestValidator.equals(
    "is_active flag should match requested value",
    createdReason.is_active,
    isActive,
  );

  // 5. Basic sanity checks for system-managed fields
  TestValidator.predicate(
    "created refund reason must have a non-empty UUID id string",
    () => createdReason.id.length > 0,
  );

  TestValidator.predicate(
    "created_at timestamp should be a non-empty string",
    () => createdReason.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at timestamp should be a non-empty string",
    () => createdReason.updated_at.length > 0,
  );
}
