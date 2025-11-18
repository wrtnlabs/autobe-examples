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
 * Verify that access to legal hold target details is restricted to
 * authenticated admins.
 *
 * Business goal:
 *
 * - Ensure that sensitive legal hold target data under the governance subsystem
 *   is not exposed to unauthenticated callers.
 * - Confirm that authenticated admin context can successfully create and retrieve
 *   a specific legal hold target.
 *
 * Steps:
 *
 * 1. Prepare an unauthenticated connection by cloning the provided connection with
 *    empty headers.
 * 2. Call GET
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets/{legalHoldTargetId}
 *    using obviously invalid path parameters (random strings) and assert that
 *    the call fails using TestValidator.error (no status-code inspection).
 * 3. Using the original connection, join an admin via POST /auth/admin/join to
 *    establish an authenticated admin context. SDK will manage the
 *    Authorization header automatically.
 * 4. Create a legal hold via POST /shoppingMall/admin/legalHolds with a unique
 *    code and reasonable descriptive data.
 * 5. Create a legal hold target for that hold via POST
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets with a random UUID
 *    target_id and simple descriptive metadata.
 * 6. Retrieve the legal hold target via GET
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets/{legalHoldTargetId}
 *    using the authenticated connection and assert that:
 *
 *    - The response type is valid via typia.assert.
 *    - The id, shopping_mall_legal_hold_id, target_type, target_id, target_display
 *         and note fields match the created target.
 */
export async function test_api_legal_hold_target_access_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Simulate unauthenticated access by cloning connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Unauthenticated call must fail
  await TestValidator.error(
    "unauthenticated access to legal hold target must fail",
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.targets.at(
        unauthConn,
        {
          legalHoldCode: "non-existent-code",
          legalHoldTargetId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );

  // 3. Join an admin (authenticated context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 4. Create a legal hold
  const legalHoldBody = {
    code: RandomGenerator.alphaNumeric(16),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: RandomGenerator.alphaNumeric(12),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldBody,
    });
  typia.assert(legalHold);

  // 5. Create a legal hold target for the created legal hold
  const targetBody = {
    target_type: "customer",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    target_display: RandomGenerator.name(2),
    note: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const createdTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode: legalHold.code,
        body: targetBody,
      },
    );
  typia.assert(createdTarget);

  // 6. Retrieve the legal hold target as authenticated admin
  const reloadedTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.at(connection, {
      legalHoldCode: legalHold.code,
      legalHoldTargetId: createdTarget.id,
    });
  typia.assert(reloadedTarget);

  // Validate important fields match between created and reloaded target
  TestValidator.equals(
    "legal hold target id must match",
    reloadedTarget.id,
    createdTarget.id,
  );
  TestValidator.equals(
    "legal hold foreign key must match",
    reloadedTarget.shopping_mall_legal_hold_id,
    createdTarget.shopping_mall_legal_hold_id,
  );
  TestValidator.equals(
    "legal hold target_type must match",
    reloadedTarget.target_type,
    createdTarget.target_type,
  );
  TestValidator.equals(
    "legal hold target_id must match",
    reloadedTarget.target_id,
    createdTarget.target_id,
  );
  TestValidator.equals(
    "legal hold target_display must match",
    reloadedTarget.target_display,
    createdTarget.target_display,
  );
  TestValidator.equals(
    "legal hold note must match",
    reloadedTarget.note,
    createdTarget.note,
  );
}
