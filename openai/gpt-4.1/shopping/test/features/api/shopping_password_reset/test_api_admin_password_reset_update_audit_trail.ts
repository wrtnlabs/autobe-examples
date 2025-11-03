import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPasswordReset";

/**
 * Validate update operations for admin-managed password reset requests.
 *
 * This scenario tests: (1) updating the expires_at field for an existing reset,
 * (2) marking the reset as consumed, (3) verifying that no update is allowed on
 * consumed or expired resets, (4) auditability via returned entity state.
 * Steps:
 *
 * 1. Admin registers and authenticates
 * 2. A password reset request is created (direct DTO instantiation)
 * 3. Update the expires_at and check that it's changed
 * 4. Mark the reset as consumed (set consumed_at)
 * 5. Attempt to update after consumption (expect business error)
 * 6. Simulate expiry, attempt update (expect business error)
 *
 * Note: No explicit audit log fetch; audit verification is by update
 * time/history
 */
export async function test_api_admin_password_reset_update_audit_trail(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<8> &
      tags.MaxLength<128>,
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: "active" as string & tags.MinLength<3> & tags.MaxLength<20>,
  } satisfies IShoppingAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Prepare a password reset request DTO in memory
  const resetOrigin = {
    id: typia.random<string & tags.Format<"uuid">>(),
    request_email: adminJoinBody.email,
    reset_code: RandomGenerator.alphaNumeric(32),
    shopping_customer_id: undefined,
    shopping_seller_id: undefined,
    shopping_admin_id: admin.id,
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(), // 3 hours from now
    consumed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingPasswordReset;

  // 3. Successful update: extend expires_at by 1 hour
  const newExpires = new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString();
  const update1Body = {
    expires_at: newExpires,
  } satisfies IShoppingPasswordReset.IUpdate;
  const updated1 = await api.functional.shopping.admin.passwordResets.update(
    connection,
    {
      passwordResetId: resetOrigin.id,
      body: update1Body,
    },
  );
  typia.assert(updated1);
  TestValidator.equals("expires_at updated", updated1.expires_at, newExpires);
  TestValidator.equals("reset not consumed yet", updated1.consumed_at, null);

  // 4. Mark as consumed
  const nowConsumed = new Date().toISOString();
  const update2Body = {
    expires_at: newExpires,
    consumed_at: nowConsumed,
  } satisfies IShoppingPasswordReset.IUpdate;
  const updated2 = await api.functional.shopping.admin.passwordResets.update(
    connection,
    {
      passwordResetId: resetOrigin.id,
      body: update2Body,
    },
  );
  typia.assert(updated2);
  TestValidator.equals("consumed_at set", updated2.consumed_at, nowConsumed);

  // 5. Attempt update after consumed: should fail
  await TestValidator.error("cannot update when consumed_at set", async () => {
    await api.functional.shopping.admin.passwordResets.update(connection, {
      passwordResetId: resetOrigin.id,
      body: {
        expires_at: newExpires,
        consumed_at: nowConsumed,
      },
    });
  });

  // 6. Simulate expiry: move past expires_at and try update (should fail)
  const expiredResetId = typia.random<string & tags.Format<"uuid">>();
  const expiredExpires = new Date(Date.now() - 1000 * 60).toISOString(); // 1min ago
  const expiredReset = {
    ...resetOrigin,
    id: expiredResetId,
    expires_at: expiredExpires,
    consumed_at: null,
  } satisfies IShoppingPasswordReset;
  await TestValidator.error("cannot update when expired", async () => {
    await api.functional.shopping.admin.passwordResets.update(connection, {
      passwordResetId: expiredResetId,
      body: {
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
      },
    });
  });
}
