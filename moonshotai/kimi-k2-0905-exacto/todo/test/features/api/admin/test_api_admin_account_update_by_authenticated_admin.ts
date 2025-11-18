import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validates updating administrator account fields (email, password, lock flag)
 * as an authenticated admin.
 *
 * The workflow:
 *
 * 1. Register first admin (adminA).
 * 2. Register a second admin (adminB) for uniqueness testing.
 * 3. As adminA, update their own record (fields: email, password, is_locked=false)
 *    and assert field and timestamp changes.
 * 4. Attempt to update adminA's email to adminB's email (should fail with
 *    uniqueness error).
 * 5. Lock adminA's account (set is_locked=true), assert field and timestamp, and
 *    verify further login is blocked.
 */
export async function test_api_admin_account_update_by_authenticated_admin(
  connection: api.IConnection,
) {
  // 1. Register adminA
  const adminAInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.join/1",
    referrer: "https://landing/1",
  } satisfies ITodoListAdmin.IJoin;
  const adminAAuth: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminAInput });
  typia.assert(adminAAuth);

  // 2. Register adminB
  const adminBInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.join/2",
    referrer: "https://landing/2",
  } satisfies ITodoListAdmin.IJoin;
  const adminBAuth: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBInput });
  typia.assert(adminBAuth);

  // 3. Update adminA account's email & password & is_locked=false
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updateInput1 = {
    email: newEmail,
    password: RandomGenerator.alphaNumeric(14),
    is_locked: false,
  } satisfies ITodoListAdmin.IUpdate;
  // Save previous updated_at for timestamp comparison
  const prevUpdatedAt = adminAAuth.updated_at;
  const updated: ITodoListAdmin =
    await api.functional.todoList.admin.admins.update(connection, {
      adminId: adminAAuth.id,
      body: updateInput1,
    });
  typia.assert(updated);

  TestValidator.equals(
    "updated admin id remains the same",
    updated.id,
    adminAAuth.id,
  );
  TestValidator.equals(
    "updated admin email matches input",
    updated.email,
    newEmail,
  );
  TestValidator.equals(
    "updated is_locked flag matches input",
    updated.is_locked,
    false,
  );
  TestValidator.predicate(
    "updated_at timestamp is newer after update",
    new Date(updated.updated_at).getTime() > new Date(prevUpdatedAt).getTime(),
  );

  // 4. Try to update adminA's email to already-registered adminB's email (should fail)
  await TestValidator.error(
    "updating to duplicate email is rejected",
    async () => {
      await api.functional.todoList.admin.admins.update(connection, {
        adminId: adminAAuth.id,
        body: {
          email: adminBAuth.email,
        } satisfies ITodoListAdmin.IUpdate,
      });
    },
  );

  // 5. Lock adminA's account (set is_locked=true)
  const prevUpdatedAt2 = updated.updated_at;
  const locked: ITodoListAdmin =
    await api.functional.todoList.admin.admins.update(connection, {
      adminId: adminAAuth.id,
      body: {
        is_locked: true,
      } satisfies ITodoListAdmin.IUpdate,
    });
  typia.assert(locked);

  TestValidator.equals(
    "locked admin id remains the same",
    locked.id,
    updated.id,
  );
  TestValidator.equals("locked is_locked flag is true", locked.is_locked, true);
  TestValidator.predicate(
    "updated_at advances after locking",
    new Date(locked.updated_at).getTime() > new Date(prevUpdatedAt2).getTime(),
  );

  // 6. Confirm adminA is now locked out - login/join should fail
  await TestValidator.error(
    "locked admin cannot re-join with previous email",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: locked.email,
          password: RandomGenerator.alphaNumeric(13),
          ip: null,
          href: "https://admin.rejoin/locked",
          referrer: "https://landing/locked",
        } satisfies ITodoListAdmin.IJoin,
      });
    },
  );
}
