import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoSystemConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_todo_system_config } from "../prepare/prepare_random_todo_system_config";

export async function generate_random_todo_system_configs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoSystemConfig.ICreate> | undefined;
  },
): Promise<ITodoSystemConfig> {
  const prepared: ITodoSystemConfig.ICreate = prepare_random_todo_system_config(
    props.body,
  );
  return await api.functional.todo.system_configs.create(connection, {
    body: prepared,
  });
}
