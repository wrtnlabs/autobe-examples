import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import { prepare_random_todo_app_configuration } from "../prepare/prepare_random_todo_app_configuration";
export async function generate_random_todo_app_todo_user_configurations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppConfiguration.ICreate>;
  },
): Promise<ITodoAppConfiguration> {
  const prepared = prepare_random_todo_app_configuration(props.body);
  const result: ITodoAppConfiguration =
    await api.functional.todoApp.todoUser.configurations.create(connection, {
      body: prepared,
    });
  return result;
}
