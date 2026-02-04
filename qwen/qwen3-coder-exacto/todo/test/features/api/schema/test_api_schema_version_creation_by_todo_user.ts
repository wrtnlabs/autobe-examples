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
export async function test_api_schema_version_creation_by_todo_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a todoUser to create schema versions
  const todoUser = await authorize_todo_user_join(connection, {
    body: {
      email: "test@example.com",
      password: "password123",
      href: "https://todo.wrtn.io/register",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Create a new connection with the authorized user's token
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${todoUser.token.access}`,
    },
  };
  // 2. Test that a todoUser can successfully create a new schema version entry with valid version information and description
  const schemaVersion =
    await generate_random_todo_app_todo_user_schema_versions_create(
      userConnection,
      {
        body: {
          version: "v1.0.0",
          description: "Initial schema version for todo application",
        },
      },
    );
  // 3. Verify that the system properly validates the input, creates the schema version record with appropriate timestamps
  typia.assert(schemaVersion);
  TestValidator.equals(
    "schema version id should be a valid UUID",
    typeof schemaVersion.id,
    "string",
  );
  TestValidator.predicate(
    "schema version id should be a valid UUID format",
    () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        schemaVersion.id,
      ),
  );
  TestValidator.equals(
    "schema version number should match input",
    schemaVersion.versionNumber,
    "v1.0.0",
  );
  TestValidator.equals(
    "schema version description should match input",
    schemaVersion.description,
    "Initial schema version for todo application",
  );
  TestValidator.predicate(
    "schema version should have createdAt timestamp",
    () =>
      typeof schemaVersion.createdAt === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        schemaVersion.createdAt,
      ),
  );
  TestValidator.predicate(
    "schema version should have updatedAt timestamp",
    () =>
      typeof schemaVersion.updatedAt === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        schemaVersion.updatedAt,
      ),
  );
  TestValidator.predicate(
    "createdAt and updatedAt should be the same for a new record",
    () => schemaVersion.createdAt === schemaVersion.updatedAt,
  );
}
