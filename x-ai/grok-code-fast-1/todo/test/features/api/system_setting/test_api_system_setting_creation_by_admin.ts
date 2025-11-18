import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";
import type { ITodoListSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemSetting";

/**
 * Validates admin system setting creation and enforces uniqueness/field
 * validation.
 *
 * 1. Register a new admin account (join).
 * 2. As the authenticated admin, create a system-wide setting (with unique key,
 *    valid value, description).
 * 3. Validate system setting response structure, required/audit fields, and
 *    uniqueness enforcement.
 * 4. Attempt to create a duplicate key to confirm uniqueness constraint is
 *    enforced (error test).
 * 5. (Optional) Attempt creation with missing or invalid fields (only if feasible
 *    within type safety).
 */
export async function test_api_system_setting_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin for the session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword satisfies string,
    display_name: RandomGenerator.name(),
    href: `https://admin-portal.${RandomGenerator.alphabets(5)}.io/register`,
    referrer: `https://landing.${RandomGenerator.alphabets(6)}.com/`,
    ip: null,
  } satisfies ITodoListAdmin.ICreate;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // Step 2: As authenticated admin, create a system setting
  const uniqueKey = `FEATURE_${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const createBody = {
    key: uniqueKey as string &
      tags.MinLength<1> &
      tags.MaxLength<255> &
      tags.Pattern<"^[A-Z0-9_]+$">,
    value: RandomGenerator.alphaNumeric(15),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 12,
    }),
  } satisfies ITodoListSystemSetting.ICreate;
  const created: ITodoListSystemSetting =
    await api.functional.todoList.admin.systemSettings.create(connection, {
      body: createBody,
    });
  typia.assert(created);
  TestValidator.equals(
    "system setting key matches input",
    created.key,
    uniqueKey,
  );
  TestValidator.equals(
    "system setting value matches input",
    created.value,
    createBody.value,
  );
  TestValidator.equals(
    "system setting description matches input",
    created.description,
    createBody.description,
  );
  TestValidator.predicate(
    "system setting id is a valid uuid",
    typeof created.id === "string" && /^[0-9a-f-]{36}$/i.test(created.id),
  );
  TestValidator.predicate(
    "system setting version is int32 >= 1",
    typeof created.version === "number" && created.version >= 1,
  );
  typia.assert(created.created_at);
  typia.assert(created.updated_at);

  // Step 3: Uniqueness enforcement - attempt to create with same key, expect error
  await TestValidator.error(
    "system setting key must be unique (duplicate key should fail)",
    async () => {
      await api.functional.todoList.admin.systemSettings.create(connection, {
        body: createBody,
      });
    },
  );
}
