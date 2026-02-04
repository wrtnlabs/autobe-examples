import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppSchemaVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSchemaVersion";
import { prepare_random_todo_app_schema_version } from "../prepare/prepare_random_todo_app_schema_version";
export async function generate_random_todo_app_todo_user_schema_versions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppSchemaVersion.ICreate> | undefined;
  },
): Promise<ITodoAppSchemaVersion> {
  const prepared: ITodoAppSchemaVersion.ICreate =
    prepare_random_todo_app_schema_version(props.body);
  return await api.functional.todoApp.todoUser.schema.versions.create(
    connection,
    {
      body: prepared,
    },
  );
}
