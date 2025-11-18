import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemSetting";

/**
 * Verifies that an authenticated admin can update an existing system setting.
 *
 * Scenario steps:
 *
 * 1. Register a new admin and authenticate, establishing an API session.
 * 2. As the authenticated admin, create an initial system setting with random key,
 *    value, and optional description.
 * 3. Update the just-created system setting using its 'key' field, providing a new
 *    value and a new (or null) description.
 * 4. Assert that the API response reflects the updated value and description, the
 *    key remains unchanged, and the 'updated_at' timestamp is newer than before
 *    while 'created_at' is unmodified.
 * 5. Assert type and schema conformance for all API responses.
 */
export async function test_api_system_setting_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate the API client session.
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin-join.example.com",
    referrer: "https://referrer.example.com",
  } satisfies ITodoListAdmin.IJoin;
  const adminAuth: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 2. Create a unique system setting entry as this admin.
  const initialKey = RandomGenerator.alphaNumeric(12);
  const initialValue = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
    wordMin: 2,
    wordMax: 6,
  });
  const initialDescription = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const createBody = {
    key: initialKey,
    value: initialValue,
    description: initialDescription,
  } satisfies ITodoListSystemSetting.ICreate;
  const created: ITodoListSystemSetting =
    await api.functional.todoList.admin.systemSettings.create(connection, {
      body: createBody,
    });
  typia.assert(created);
  TestValidator.equals(
    "created key matches requested",
    created.key,
    initialKey,
  );
  TestValidator.equals(
    "created value matches requested",
    created.value,
    initialValue,
  );
  TestValidator.equals(
    "created description matches requested",
    created.description,
    initialDescription,
  );

  // 3. Prepare new value and optionally a new description (may be null or omitted).
  const newValue = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 4,
    wordMin: 3,
    wordMax: 8,
  });
  const nextDescription = RandomGenerator.pick([
    RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    null,
    undefined,
  ]);
  const updateBody = {
    value: newValue,
    ...(nextDescription !== undefined ? { description: nextDescription } : {}),
  } satisfies ITodoListSystemSetting.IUpdate;
  // 4. Update the system setting using its key.
  const updated: ITodoListSystemSetting =
    await api.functional.todoList.admin.systemSettings.update(connection, {
      key: initialKey,
      body: updateBody,
    });
  typia.assert(updated);
  TestValidator.equals("system setting key unchanged", updated.key, initialKey);
  TestValidator.equals("system setting value updated", updated.value, newValue);
  TestValidator.equals(
    "system setting description updated",
    updated.description,
    nextDescription ?? null,
  );
  TestValidator.equals(
    "created_at must remain the same",
    updated.created_at,
    created.created_at,
  );
  TestValidator.predicate(
    "updated_at is newer after update",
    new Date(updated.updated_at).getTime() >
      new Date(created.updated_at).getTime(),
  );
}
