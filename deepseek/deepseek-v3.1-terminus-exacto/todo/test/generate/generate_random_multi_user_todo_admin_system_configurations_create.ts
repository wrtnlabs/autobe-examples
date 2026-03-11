import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_multi_user_todo_system_configuration } from "../prepare/prepare_random_multi_user_todo_system_configuration";

export async function generate_random_multi_user_todo_admin_system_configurations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMultiUserTodoSystemConfiguration.ICreate> | undefined;
  },
): Promise<IMultiUserTodoSystemConfiguration> {
  const prepared: IMultiUserTodoSystemConfiguration.ICreate =
    prepare_random_multi_user_todo_system_configuration(props.body);
  const result: IMultiUserTodoSystemConfiguration =
    await api.functional.multiUserTodo.admin.system_configurations.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
