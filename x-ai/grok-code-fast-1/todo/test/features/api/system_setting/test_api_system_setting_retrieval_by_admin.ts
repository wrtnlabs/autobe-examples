import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";
import type { ITodoListSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemSetting";

/**
 * Validates that an authenticated admin can create and retrieve a specific
 * system-wide configuration setting by its key.
 *
 * Context: System settings are critical application-wide flags managed
 * exclusively by admin users. Only authenticated admins are allowed to create
 * and read these configurations.
 *
 * Workflow Steps:
 *
 * 1. Register a new admin account with a unique email and required session context
 *    fields.
 * 2. Authenticate as that admin and create a new unique system setting (key,
 *    value, [optional] description).
 * 3. Retrieve the system setting using its key via the
 *    /todoList/admin/systemSettings/{key} endpoint.
 * 4. Assert that the returned system setting's key, value, and description exactly
 *    match those given at creation, and validate metadata (id, version,
 *    timestamps).
 *
 * Implementation:
 *
 * - Use strict types for key and value (enforcing required pattern/length
 *   constraints).
 * - Confirm round-trip fidelity: created and retrieved data match.
 * - Authenticate using admin's token: join endpoint will embed the credential in
 *   the connection automatically.
 * - Use typia.assert() to fully validate API return types.
 * - Validate that the admin-only access is effective by ensuring successful
 *   retrieval when authenticated.
 */
export async function test_api_system_setting_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin (unique email, proper password, session info)
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const display_name: string = RandomGenerator.name();
  const href: string = "https://admin-dashboard.example.com/settings/register";
  const referrer: string = "https://admin-dashboard.example.com";
  const adminAuth: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password: password as string & tags.MinLength<8> & tags.MaxLength<128>,
        display_name: display_name as string &
          tags.MinLength<2> &
          tags.MaxLength<50>,
        href: href as string & tags.Format<"uri">,
        referrer: referrer as string & tags.Format<"uri">,
        // ip is optional (let server infer)
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Create unique system setting
  const settingKey: string = RandomGenerator.alphabets(10).toUpperCase(); // e.g. "TESTSETTING"
  const key: string = settingKey.replace(/[^A-Z0-9_]/g, "_").slice(0, 20); // ensure pattern & maxLength
  const value: string = RandomGenerator.paragraph({ sentences: 2 });
  const description: string = RandomGenerator.paragraph({ sentences: 3 });
  const created: ITodoListSystemSetting =
    await api.functional.todoList.admin.systemSettings.create(connection, {
      body: {
        key: key as string &
          tags.MinLength<1> &
          tags.MaxLength<255> &
          tags.Pattern<"^[A-Z0-9_]+$">,
        value: value as string & tags.MinLength<1> & tags.MaxLength<2048>,
        description: description as string &
          tags.MinLength<1> &
          tags.MaxLength<1000>,
      } satisfies ITodoListSystemSetting.ICreate,
    });
  typia.assert(created);

  // 3. Retrieve system setting by key as admin
  const retrieved: ITodoListSystemSetting =
    await api.functional.todoList.admin.systemSettings.at(connection, {
      key: created.key,
    });
  typia.assert(retrieved);

  // 4. Validate round-trip data integrity
  TestValidator.equals("system setting key matches", retrieved.key, key);
  TestValidator.equals("system setting value matches", retrieved.value, value);
  TestValidator.equals(
    "system setting description matches",
    retrieved.description,
    description,
  );
  TestValidator.equals(
    "system setting id is consistent",
    retrieved.id,
    created.id,
  );
  TestValidator.equals(
    "system setting version is consistent",
    retrieved.version,
    created.version,
  );
  TestValidator.equals(
    "system setting created_at is consistent",
    retrieved.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "system setting updated_at is consistent",
    retrieved.updated_at,
    created.updated_at,
  );
}
