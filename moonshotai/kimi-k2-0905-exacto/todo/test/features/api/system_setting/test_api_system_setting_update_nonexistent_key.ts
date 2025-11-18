import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemSetting";

/**
 * Validates proper error handling when attempting to update a system setting
 * with a non-existent key.
 *
 * 1. Register a new admin account using a random (unique) email and valid
 *    password.
 * 2. Attempt to update a system setting by providing a key that does NOT exist
 *    (guaranteed random string/uuid).
 * 3. Assert that the API responds with an error (i.e., not-found), confirming no
 *    unintentional modification is performed for missing keys.
 */
export async function test_api_system_setting_update_nonexistent_key(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new admin
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const joinOutput: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password,
        href: "https://admin.todoapp-e2e.test/join",
        referrer: "https://todoapp-e2e.test/",
        ip: null,
      } satisfies ITodoListAdmin.IJoin,
    });
  typia.assert(joinOutput);

  // Step 2: Try updating a system setting with a non-existent key
  const nonExistentKey = typia.random<string & tags.Format<"uuid">>(); // virtually guaranteed to not exist
  const updateBody = {
    value: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITodoListSystemSetting.IUpdate;

  await TestValidator.error(
    "updating non-existent setting key should yield an error",
    async () => {
      await api.functional.todoList.admin.systemSettings.update(connection, {
        key: nonExistentKey,
        body: updateBody,
      });
    },
  );
}
