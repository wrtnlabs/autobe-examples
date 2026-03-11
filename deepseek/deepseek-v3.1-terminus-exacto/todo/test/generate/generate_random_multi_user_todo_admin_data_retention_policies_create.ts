import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoDataRetentionPolicy";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_multi_user_todo_data_retention_policy } from "../prepare/prepare_random_multi_user_todo_data_retention_policy";

export async function generate_random_multi_user_todo_admin_data_retention_policies_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMultiUserTodoDataRetentionPolicy.ICreate> | undefined;
  },
): Promise<IMultiUserTodoDataRetentionPolicy> {
  const prepared: IMultiUserTodoDataRetentionPolicy.ICreate =
    prepare_random_multi_user_todo_data_retention_policy(props.body);
  return await api.functional.multiUserTodo.admin.data_retention_policies.create(
    connection,
    {
      body: prepared,
    },
  );
}
