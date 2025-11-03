import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * E2E test verifying that an authenticated admin can update their own admin
 * profile info.
 *
 * 1. Register a new admin (join), yielding adminId and session.
 * 2. Craft an update DTO (change name, email, role, status) that differs from
 *    original join values.
 * 3. Call update endpoint as authenticated admin using their own adminId and
 *    update body.
 * 4. Assert response contains all updated fields, and that only intended fields
 *    were changed.
 * 5. Error: Attempt to update using a random/non-existing adminId and expect
 *    error.
 * 6. Error: Attempt to update email to another admin's email, expect unique
 *    constraint error if attempted (requires two admin accounts).
 */
export async function test_api_admin_account_update_with_joined_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create first admin via /auth/admin/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "operator",
      "compliance",
    ] as const),
    status: RandomGenerator.pick([
      "active",
      "suspended",
      "pending",
      "locked",
    ] as const),
  } satisfies IShoppingAdmin.IJoin;
  const adminAuth: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(adminAuth);

  // Step 2: Prepare update DTO (modify all properties)
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "operator",
      "compliance",
    ] as const),
    status: RandomGenerator.pick([
      "active",
      "suspended",
      "pending",
      "locked",
    ] as const),
  } satisfies IShoppingAdmin.IUpdate;
  const updatedAdmin: IShoppingAdmin =
    await api.functional.shopping.admin.admins.update(connection, {
      adminId: adminAuth.id,
      body: updateBody,
    });
  typia.assert(updatedAdmin);

  // Step 3: Validate that each updatable field matches updateBody
  TestValidator.equals("updated email", updatedAdmin.email, updateBody.email);
  TestValidator.equals("updated name", updatedAdmin.name, updateBody.name);
  TestValidator.equals("updated role", updatedAdmin.role, updateBody.role);
  TestValidator.equals(
    "updated status",
    updatedAdmin.status,
    updateBody.status,
  );
  TestValidator.notEquals(
    "updated_at has changed",
    updatedAdmin.updated_at,
    adminAuth.updated_at,
  );

  // Step 4: Negative case - update non-existent adminId should cause error
  await TestValidator.error("cannot update non-existent adminId", async () => {
    await api.functional.shopping.admin.admins.update(connection, {
      adminId: typia.random<string & tags.Format<"uuid">>(),
      body: updateBody,
    });
  });

  // Step 5: Unique constraint - register a second admin to test duplicate email constraint
  const secondJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "operator",
      "compliance",
    ] as const),
    status: RandomGenerator.pick([
      "active",
      "suspended",
      "pending",
      "locked",
    ] as const),
  } satisfies IShoppingAdmin.IJoin;
  const secondAdminAuth: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: secondJoinBody });
  typia.assert(secondAdminAuth);
  // Now try to update admin1's email to admin2's email
  await TestValidator.error("email uniqueness constraint", async () => {
    await api.functional.shopping.admin.admins.update(connection, {
      adminId: adminAuth.id,
      body: { email: secondJoinBody.email },
    });
  });
}
