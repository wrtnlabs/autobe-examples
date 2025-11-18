import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Ensure that creating a todoApp system setting enforces the unique key
 * constraint.
 *
 * Business purpose:
 *
 * - System settings are addressed by a unique business key (e.g.,
 *   "max_active_todos_per_user").
 * - Only one active configuration entry per key should exist; attempts to create
 *   a second setting with the same key must be rejected by the backend.
 *
 * This test covers the admin-side workflow for creating system settings and
 * verifies that attempts to re-use an already-registered key result in an error
 * instead of silently creating duplicate records.
 *
 * Flow:
 *
 * 1. Register a new admin user via POST /auth/adminUser/join, using a valid
 *    ITodoAppAdminUser.IJoin payload.
 *
 *    - This establishes an authorized admin session and configures the connection's
 *         Authorization header through the SDK.
 * 2. As the authenticated admin, create a new system setting via POST
 *    /todoApp/adminUser/systemSettings with an ITodoAppSystemSetting.ICreate
 *    body using key "max_active_todos_per_user".
 *
 *    - Assert that creation succeeds and that the returned ITodoAppSystemSetting has
 *         the same key and enabled flag as requested.
 * 3. Attempt to create another system setting with the same key but a different
 *    value and description.
 *
 *    - Wrap this call with TestValidator.error to assert that the call fails,
 *         indicating enforcement of the unique key constraint.
 * 4. Since no listing or get endpoint is available in this context, infer that
 *    only a single record exists for the key by the combination of the first
 *    success and the second failure.
 */
export async function test_api_system_setting_create_unique_key_enforcement(
  connection: api.IConnection,
) {
  // 1. Register a new admin user to obtain an authorized admin session.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.todo-app.local/landing" as string &
      tags.Format<"uri">,
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorized);

  // 2. Create an initial system setting with a unique key.
  const settingKey = "max_active_todos_per_user";
  const firstCreateBody = {
    key: settingKey,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 8,
    }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: firstCreateBody,
    });
  typia.assert<ITodoAppSystemSetting>(createdSetting);

  // Validate that the created setting reflects our requested key and enabled flag.
  TestValidator.equals(
    "created system setting key should match request",
    createdSetting.key,
    firstCreateBody.key,
  );
  TestValidator.equals(
    "created system setting should be enabled",
    createdSetting.enabled,
    firstCreateBody.enabled,
  );

  // 3. Attempt to create another system setting with the same key, expecting failure.
  const secondCreateBody = {
    key: settingKey,
    value: "200",
    type: "int",
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  await TestValidator.error(
    "duplicate system setting key must fail",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.create(connection, {
        body: secondCreateBody,
      });
    },
  );
}
