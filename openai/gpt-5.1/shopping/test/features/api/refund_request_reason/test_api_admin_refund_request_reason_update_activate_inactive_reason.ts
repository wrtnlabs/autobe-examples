import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Activate an inactive refund request reason via admin update.
 *
 * Business flow:
 *
 * 1. Register an admin account using POST /auth/admin/join to obtain an
 *    authenticated admin context (token is auto-attached to connection).
 * 2. As that admin, create a refund request reason with is_active = false via POST
 *    /shoppingMall/admin/refundRequestReasons.
 * 3. Capture the created reason's business code, created_at, updated_at, and
 *    current is_active flag.
 * 4. Call PUT /shoppingMall/admin/refundRequestReasons/{reasonCode} with an update
 *    body that only toggles is_active to true.
 * 5. Verify that the update response keeps code and created_at unchanged, flips
 *    is_active to true, and modifies updated_at.
 *
 * Note: Although the original scenario suggested verifying persistence via a
 * GET endpoint, no such GET API is present in the provided SDK list. This test
 * therefore validates using the update response only.
 */
export async function test_api_admin_refund_request_reason_update_activate_inactive_reason(
  connection: api.IConnection,
) {
  // 1. Admin joins (registration + authentication context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an initially INACTIVE refund request reason
  const createBody = {
    code: `reason_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    applies_to_cancellation: true,
    applies_to_refund: true,
    is_active: false,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  const created: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Sanity checks on created entity
  TestValidator.equals(
    "created reason should be inactive initially",
    created.is_active,
    false,
  );
  TestValidator.equals(
    "created reason code should match request body",
    created.code,
    createBody.code,
  );

  const originalCode: string = created.code;
  const originalCreatedAt: string & tags.Format<"date-time"> =
    created.created_at;
  const originalUpdatedAt: string & tags.Format<"date-time"> =
    created.updated_at;

  // 3. Update: activate the reason (set is_active -> true)
  const updateBody = {
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.IUpdate;

  const updated: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.update(
      connection,
      {
        reasonCode: originalCode,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Assertions: verify activation and timestamps
  TestValidator.equals(
    "updated reason code should remain the same",
    updated.code,
    originalCode,
  );
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updated.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "reason should now be active after update",
    updated.is_active,
    true,
  );
  TestValidator.notEquals(
    "updated_at should change after update",
    updated.updated_at,
    originalUpdatedAt,
  );
}
