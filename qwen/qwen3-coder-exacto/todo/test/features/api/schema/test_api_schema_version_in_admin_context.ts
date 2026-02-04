import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSchemaVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSchemaVersion";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { prepare_random_todo_app_schema_version } from "../../../prepare/prepare_random_todo_app_schema_version";
import { generate_random_todo_app_todo_user_schema_versions_create } from "../../../generate/generate_random_todo_app_todo_user_schema_versions_create";
import { authorize_todo_user_join } from "../../../authorize/authorize_todo_user_join";
import { authorize_todo_user_login } from "../../../authorize/authorize_todo_user_login";
import { authorize_todo_user_refresh } from "../../../authorize/authorize_todo_user_refresh";
export async function test_api_schema_version_in_admin_context(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a todo user with administrative privileges
  const todoUser = await authorize_todo_user_join(connection, {
    body: {
      email: `admin-${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://todo.wrtn.io/register",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Step 2: Create a new connection for the authenticated user
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${todoUser.token.access}`,
    },
  };
  // Step 3: Create a schema version to be deleted
  const schemaVersion =
    await generate_random_todo_app_todo_user_schema_versions_create(
      userConnection,
      {
        body: {
          version: `v${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  // Step 4: Delete the created schema version
  await api.functional.todoApp.todoUser.schema.versions.erase(userConnection, {
    versionId: schemaVersion.id,
  });
  // Step 5: Verify the schema version was deleted by attempting to access it
  await TestValidator.error(
    "schema version should no longer exist after deletion",
    async () => {
      // This should throw a 404 error since the schema version was deleted
      await api.functional.todoApp.todoUser.schema.versions.erase(
        userConnection,
        {
          versionId: schemaVersion.id,
        },
      );
    },
  );
}
