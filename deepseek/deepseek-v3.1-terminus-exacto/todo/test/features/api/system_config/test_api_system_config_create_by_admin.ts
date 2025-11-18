import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Validate admin creation of system-wide configuration records in the Todo List
 * app.
 *
 * - Registers a new admin and receives authentication.
 * - Creates a system-wide configuration with unique key, value, and optional
 *   description.
 * - Asserts correct property assignment, auto-generated timestamps, and absence
 *   of deleted_at for new records.
 * - Ensures description field is both optional and properly saved/returned when
 *   present.
 *
 * Steps:
 *
 * 1. Register admin using a unique email/password (POST /auth/admin/join)
 * 2. Use the authenticated connection to create a new system config (POST
 *    /todoList/admin/systemConfigs)
 * 3. Assert returned config has correct key/value/description (if provided)
 * 4. Assert timestamps (created_at/updated_at) are set and valid strings
 * 5. Assert deleted_at is null or undefined (should not be present for a new
 *    config)
 */
export async function test_api_system_config_create_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a new system config (with and without description)
  // 2.1 With description
  const uniqueKey = `setting_${RandomGenerator.alphaNumeric(10)}`;
  const createBodyWithDesc = {
    key: uniqueKey,
    value: RandomGenerator.alphabets(12),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ITodoListSystemConfig.ICreate;
  const configWithDesc =
    await api.functional.todoList.admin.systemConfigs.create(connection, {
      body: createBodyWithDesc,
    });
  typia.assert(configWithDesc);
  TestValidator.equals(
    "config key matches",
    configWithDesc.key,
    createBodyWithDesc.key,
  );
  TestValidator.equals(
    "config value matches",
    configWithDesc.value,
    createBodyWithDesc.value,
  );
  TestValidator.equals(
    "config description matches",
    configWithDesc.description,
    createBodyWithDesc.description,
  );
  TestValidator.predicate(
    "created_at is ISO date string",
    typeof configWithDesc.created_at === "string" &&
      configWithDesc.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date string",
    typeof configWithDesc.updated_at === "string" &&
      configWithDesc.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at absent for new record",
    configWithDesc.deleted_at,
    null,
  );

  // 2.2 Without description (field omitted)
  const uniqueKey2 = `setting_${RandomGenerator.alphaNumeric(10)}`;
  const createBodyNoDesc = {
    key: uniqueKey2,
    value: RandomGenerator.alphabets(12),
  } satisfies ITodoListSystemConfig.ICreate;
  const configNoDesc = await api.functional.todoList.admin.systemConfigs.create(
    connection,
    {
      body: createBodyNoDesc,
    },
  );
  typia.assert(configNoDesc);
  TestValidator.equals(
    "config key matches (no desc)",
    configNoDesc.key,
    createBodyNoDesc.key,
  );
  TestValidator.equals(
    "config value matches (no desc)",
    configNoDesc.value,
    createBodyNoDesc.value,
  );
  TestValidator.equals(
    "config description omitted yields null or undefined",
    configNoDesc.description,
    null,
  );
  TestValidator.predicate(
    "created_at is ISO date string (no desc)",
    typeof configNoDesc.created_at === "string" &&
      configNoDesc.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date string (no desc)",
    typeof configNoDesc.updated_at === "string" &&
      configNoDesc.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at absent for new record (no desc)",
    configNoDesc.deleted_at,
    null,
  );
}
