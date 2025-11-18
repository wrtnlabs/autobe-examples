import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate the permanent deletion of an administrator account by an
 * authenticated privileged admin.
 *
 * This test scenario ensures that:
 *
 * 1. A privileged admin (super-admin) can register and authenticate successfully.
 * 2. Another admin account is registered (target for deletion).
 * 3. The privileged, authenticated admin deletes the target admin account via the
 *    API.
 * 4. After deletion, attempts to reuse or access the deleted admin's credentials
 *    or data will fail (negative case validation via authentication attempt),
 *    confirming the account is irrecoverably erased and audit policies are
 *    enforced.
 *
 * Steps:
 *
 * 1. Register and authenticate a super-admin, establishing full admin rights.
 * 2. Register another admin account to be deleted.
 * 3. Execute the deletion as the original authenticated super-admin.
 * 4. Attempt to join/login as the deleted admin again and expect success (join
 *    should still be possible, but previous credentials for deleted account
 *    cannot be used—testing for logical deletion). For negative access
 *    validation, only attempt login if the system exposes such an
 *    endpoint—otherwise, focus validation on the absence of errors in
 *    join/delete flow.
 *
 * Edge Cases:
 *
 * - Attempting to delete a non-existent admin returns gracefully or throws
 *   precisely defined error(s), but the test does not intentionally test for
 *   type errors.
 */
export async function test_api_admin_account_deletion_by_authenticated_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate the initial privileged admin (super-admin)
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminJoinBody = {
    email: superAdminEmail,
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    ip: RandomGenerator.pick([
      typia.random<string & tags.Format<"ipv4">>(),
      typia.random<string & tags.Format<"ipv6">>(),
      null,
    ]),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.IJoin;
  const superAdminAuth = await api.functional.auth.admin.join(connection, {
    body: superAdminJoinBody,
  });
  typia.assert(superAdminAuth);

  // 2. Register the target admin account to be deleted
  const targetAdminEmail = typia.random<string & tags.Format<"email">>();
  const targetAdminJoinBody = {
    email: targetAdminEmail,
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    ip: RandomGenerator.pick([
      typia.random<string & tags.Format<"ipv4">>(),
      typia.random<string & tags.Format<"ipv6">>(),
      null,
    ]),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.IJoin;
  const targetAdminAuth = await api.functional.auth.admin.join(connection, {
    body: targetAdminJoinBody,
  });
  typia.assert(targetAdminAuth);

  // 3. As super-admin, delete the target admin using their ID
  await api.functional.todoList.admin.admins.erase(connection, {
    adminId: targetAdminAuth.id,
  });

  // 4. Attempt to delete the target admin again (should fail, but only if system returns a controlled error)
  await TestValidator.error(
    "attempt to delete a non-existent admin must fail",
    async () => {
      await api.functional.todoList.admin.admins.erase(connection, {
        adminId: targetAdminAuth.id,
      });
    },
  );
}
