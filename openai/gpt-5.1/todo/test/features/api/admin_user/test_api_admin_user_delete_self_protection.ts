import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate self-deletion behavior for an admin user and protection of
 * post-deletion admin operations.
 *
 * ## Business intent
 *
 * This E2E test covers the workflow where a single administrative user (Admin
 * A) registers, establishes an authenticated admin session, creates at least
 * one global system setting, and then attempts to delete their own admin
 * account using the dedicated DELETE
 * /todoApp/adminUser/adminUsers/{adminUserId} endpoint.
 *
 * Because we do not have a direct "me" or login endpoint beyond join, and we
 * cannot directly query admin users, we validate self-deletion behavior
 * indirectly:
 *
 * - First, Admin A successfully creates a configuration entry via the admin-only
 *   POST /todoApp/adminUser/systemSettings endpoint.
 * - Then Admin A sends DELETE /todoApp/adminUser/adminUsers/{adminUserId}
 *   targeting their own id, which should remove or disable the account and/or
 *   session according to backend policy.
 * - Finally, we attempt another admin-only systemSettings.create call. The test
 *   expects that an error is thrown, demonstrating that self-deleted admins can
 *   no longer perform admin-only operations.
 *
 * This flow also ensures that a relevant system setting exists prior to
 * self-deletion, satisfying the requirement that business rules may depend on
 * preconfigured system settings.
 *
 * ## Steps
 *
 * 1. Register and authenticate Admin A via POST /auth/adminUser/join.
 * 2. As Admin A, create a system setting representing a policy key (e.g.,
 *    "admin_self_delete_policy").
 * 3. Delete Admin A using DELETE /todoApp/adminUser/adminUsers/{adminUserId} with
 *    adminUserId equal to Admin A's id.
 * 4. Attempt another POST /todoApp/adminUser/systemSettings call with a new key,
 *    expecting the call to fail (any error) via TestValidator.error, which
 *    models protection against continued admin operations after self-deletion.
 */
export async function test_api_admin_user_delete_self_protection(
  connection: api.IConnection,
) {
  // 1. Register and authenticate Admin A
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  TestValidator.predicate(
    "admin id should be a non-empty uuid string",
    () => admin.id.length > 0,
  );

  // 2. Create an initial system setting as Admin A
  const firstSettingKey = "admin_self_delete_policy";
  const firstSettingBody = {
    key: firstSettingKey,
    value: "enabled",
    type: "string",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "admin_policy",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const initialSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: firstSettingBody,
    });
  typia.assert(initialSetting);

  TestValidator.equals(
    "created system setting key should match input",
    initialSetting.key,
    firstSettingKey,
  );

  // 3. Self-delete admin using DELETE /todoApp/adminUser/adminUsers/{adminUserId}
  await api.functional.todoApp.adminUser.adminUsers.erase(connection, {
    adminUserId: admin.id,
  });

  // 4. Attempt another admin-only operation after self-deletion.
  //    We expect this to fail (any error), indicating the self-deleted
  //    admin can no longer perform admin-only operations.
  const secondSettingKey = "admin_self_delete_policy_post_delete_marker";
  const secondSettingBody = {
    key: secondSettingKey,
    value: "after_delete_attempt",
    type: "string",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    group: "admin_policy",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  await TestValidator.error(
    "admin should not be able to create settings after self-deletion",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.create(connection, {
        body: secondSettingBody,
      });
    },
  );
}
