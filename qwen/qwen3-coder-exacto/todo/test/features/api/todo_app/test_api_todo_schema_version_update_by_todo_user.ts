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
export async function test_api_todo_schema_version_update_by_todo_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new todo user by joining
  const todoUser = await authorize_todo_user_join(connection, {
    body: {
      email: `test-${RandomGenerator.alphaNumeric(10)}@example.com`,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://todo.wrtn.io/register",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Create a new connection for the authorized user
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${todoUser.token.access}`,
    },
  };
  // Step 2: Create an initial schema version
  const createdVersion =
    await generate_random_todo_app_todo_user_schema_versions_create(
      userConnection,
      {
        body: {
          version: `v${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 100)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(createdVersion);
  // Step 3: Update the schema version description
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedVersion =
    await api.functional.todoApp.todoUser.schema.versions.update(
      userConnection,
      {
        versionId: createdVersion.id,
        body: {
          description: updatedDescription,
        },
      },
    );
  typia.assert(updatedVersion);
  // Step 4: Verify the description was updated correctly
  TestValidator.equals(
    "schema version description updated",
    updatedVersion.description,
    updatedDescription,
  );
  TestValidator.equals(
    "schema version ID unchanged",
    updatedVersion.id,
    createdVersion.id,
  );
  TestValidator.equals(
    "schema version number unchanged",
    updatedVersion.versionNumber,
    createdVersion.versionNumber,
  );
  TestValidator.predicate(
    "updatedAt timestamp updated",
    () =>
      new Date(updatedVersion.updatedAt) > new Date(createdVersion.updatedAt),
  );
}
