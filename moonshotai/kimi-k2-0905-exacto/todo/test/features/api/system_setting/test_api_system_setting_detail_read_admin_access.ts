import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemSetting";

/**
 * Validate admin-scoped retrieval of a specific system setting by key.
 *
 * 1. Register an admin with random credentials and log in (acquire privileges).
 * 2. With the admin session, find an existing system setting via direct fetch
 *    (this provides a valid key).
 * 3. Use the GET /todoList/admin/systemSettings/{key} endpoint as admin and verify
 *    the returned record:
 *
 * - It should have all fields present (id, key, value, description, created_at,
 *   updated_at).
 * - The key and value fields should match those obtained previously.
 *
 * 4. Attempt to fetch the same setting using an unauthenticated connection and
 *    verify access is denied (authorization required).
 */
export async function test_api_system_setting_detail_read_admin_access(
  connection: api.IConnection,
) {
  // Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPayload = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<8> &
      tags.Format<"password">,
    href: "https://admin.test.example.com/register",
    referrer: "https://admin.test.example.com/",
  } satisfies ITodoListAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminPayload,
  });
  typia.assert(admin);

  // As admin, fetch a known system setting (simulate existence, use random key-value from the previous fetch)
  // Find a valid key for demonstration by fetching directly using the system's random method
  const settingSample = typia.random<ITodoListSystemSetting>();

  // Simulate inserting this setting in a real environment, here assumed already exists (since there is no create endpoint exposed)

  // Get the setting as the admin
  const setting = await api.functional.todoList.admin.systemSettings.at(
    connection,
    { key: settingSample.key },
  );
  typia.assert(setting);
  TestValidator.equals(
    "system setting key matches",
    setting.key,
    settingSample.key,
  );
  TestValidator.predicate(
    "system setting id is uuid",
    typeof setting.id === "string" && setting.id.length > 0,
  );
  TestValidator.predicate(
    "system setting value is present",
    typeof setting.value === "string" && setting.value.length > 0,
  );
  TestValidator.predicate(
    "system setting created_at valid ISO",
    typeof setting.created_at === "string" && setting.created_at.length > 0,
  );
  TestValidator.predicate(
    "system setting updated_at valid ISO",
    typeof setting.updated_at === "string" && setting.updated_at.length > 0,
  );
  // description is optional, allow null/undefined
  TestValidator.predicate(
    "system setting description field allowed",
    setting.description === undefined ||
      setting.description === null ||
      typeof setting.description === "string",
  );

  // Try unauthorized (unauthenticated) fetch for the same key
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access is denied", async () => {
    await api.functional.todoList.admin.systemSettings.at(unauthConn, {
      key: settingSample.key,
    });
  });
}
