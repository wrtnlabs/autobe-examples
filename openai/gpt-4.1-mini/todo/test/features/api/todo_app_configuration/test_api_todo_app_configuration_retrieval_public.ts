import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
export async function test_api_todo_app_configuration_retrieval_public(
  connection: api.IConnection,
): Promise<void> {
  // Create connection without authentication, as this endpoint is public
  const publicConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID for the configurationId parameter
  const configurationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the API
  const configuration: ITodoAppConfiguration =
    await api.functional.todoApp.configurations.at(publicConnection, {
      configurationId,
    });
  // Assert the response type and structure
  typia.assert(configuration);
  // Validate all properties are present and correct
  TestValidator.predicate(
    "id is non-empty string",
    typeof configuration.id === "string" && configuration.id.length > 0,
  );
  TestValidator.predicate(
    "key is non-empty string",
    typeof configuration.key === "string" && configuration.key.length > 0,
  );
  TestValidator.predicate(
    "value is non-empty string",
    typeof configuration.value === "string" && configuration.value.length > 0,
  );
  TestValidator.predicate(
    "type is non-empty string",
    typeof configuration.type === "string" && configuration.type.length > 0,
  );
  // description and deleted_at are nullable strings
  TestValidator.predicate(
    "description is string or null",
    configuration.description === null ||
      typeof configuration.description === "string",
  );
  TestValidator.predicate(
    "deleted_at is string or null",
    configuration.deleted_at === null ||
      typeof configuration.deleted_at === "string",
  );
  // created_at and updated_at are strings (date-time format guaranteed by typia.assert)
  TestValidator.predicate(
    "created_at is string",
    typeof configuration.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is string",
    typeof configuration.updated_at === "string",
  );
}
