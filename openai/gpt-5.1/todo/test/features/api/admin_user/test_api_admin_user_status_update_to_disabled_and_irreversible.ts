import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate that updating an admin user's status to a terminal disabled state is
 * applied correctly and that a subsequent attempt to reactivate that user
 * fails, leaving the status unchanged.
 *
 * Business flow:
 *
 * 1. Register Admin A (controller admin) via /auth/adminUser/join; the connection
 *    becomes authenticated as Admin A.
 * 2. As Admin A, create at least one system setting that conceptually supports a
 *    policy where certain statuses, like "disabled", are treated as terminal.
 *    The exact policy logic is hidden in the backend, but the setting simulates
 *    a configuration-based rule.
 * 3. As Admin A, register Admin B via /auth/adminUser/join and capture its id and
 *    initial updated_at timestamp.
 * 4. As Admin A, call PUT /todoApp/adminUser/adminUsers/{adminUserId}/status to
 *    set Admin B's status to "disabled" with a human-readable reason, and
 *    verify that the returned ITodoAppAdminUser reflects the new status and an
 *    updated updated_at timestamp.
 * 5. Attempt to re-activate Admin B by calling the same endpoint with status
 *    "active". Use TestValidator.error to ensure that this transition fails,
 *    without asserting any specific HTTP status code or message.
 * 6. Confirm that the only successful status change for Admin B is the one that
 *    set it to "disabled", by relying on the first successful update response
 *    and the absence of any successful second response.
 */
export async function test_api_admin_user_status_update_to_disabled_and_irreversible(
  connection: api.IConnection,
) {
  // 1. Register Admin A and authenticate
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminA: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  // 2. Configure system settings that conceptually define terminal statuses
  const terminalStatusSettingBody = {
    key: "admin_status_disabled_terminal",
    value: "true",
    type: "boolean",
    description:
      "If true, the 'disabled' status for admin users is treated as a terminal, non-reversible state.",
    group: "admin_status_policy",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const terminalStatusSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: terminalStatusSettingBody,
    });
  typia.assert(terminalStatusSetting);
  TestValidator.equals(
    "system setting key should match the configured terminal status key",
    terminalStatusSetting.key,
    terminalStatusSettingBody.key,
  );

  // 3. Register Admin B as the target admin user
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminBAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminBAuthorized);

  const adminBId = adminBAuthorized.id;
  const adminBInitialUpdatedAt = adminBAuthorized.updated_at;

  // 4. Update Admin B status to "disabled" with a reason
  const disableStatusBody = {
    status: "disabled",
    reason: "Security policy enforcement: account disabled by super-admin.",
  } satisfies ITodoAppAdminUser.IUpdateStatus;

  const disabledAdminB: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.status.updateStatus(
      connection,
      {
        adminUserId: adminBId,
        body: disableStatusBody,
      },
    );
  typia.assert(disabledAdminB);

  TestValidator.equals(
    "disabled admin id should match Admin B id",
    disabledAdminB.id,
    adminBId,
  );
  TestValidator.equals(
    "admin B status should be updated to disabled",
    disabledAdminB.status,
    disableStatusBody.status,
  );

  // Ensure updated_at changed compared to the initial authorized payload
  TestValidator.notEquals(
    "updated_at should change after disabling admin B",
    disabledAdminB.updated_at,
    adminBInitialUpdatedAt,
  );

  // 5. Attempt to re-activate Admin B; expect an error without asserting status code
  const reactivateStatusBody = {
    status: "active",
    reason: "Attempted reactivation for testing purposes.",
  } satisfies ITodoAppAdminUser.IUpdateStatus;

  await TestValidator.error(
    "reactivating a disabled admin user should be rejected by business rules",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.status.updateStatus(
        connection,
        {
          adminUserId: adminBId,
          body: reactivateStatusBody,
        },
      );
    },
  );

  // 6. Confirm that the only successful status for Admin B is the disabled state
  // Since there is no GET endpoint, rely on the fact that the second call
  // failed (no ITodoAppAdminUser returned) and that the last known successful
  // state is disabledAdminB with status "disabled".
  TestValidator.equals(
    "final known status for Admin B remains disabled after failed reactivation",
    disabledAdminB.status,
    "disabled",
  );
}
