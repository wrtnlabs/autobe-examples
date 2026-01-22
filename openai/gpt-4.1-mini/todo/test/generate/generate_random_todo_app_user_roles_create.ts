import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRole";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserRole";
import { prepare_random_todo_app_role } from "../prepare/prepare_random_todo_app_role";
export async function generate_random_todo_app_user_roles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppRole.ICreate> | undefined;
  },
): Promise<ITodoAppRole> {
  const prepared: ITodoAppRole.ICreate = prepare_random_todo_app_role(
    props.body,
  );
  const result: ITodoAppRole = await api.functional.todoApp.user.roles.create(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}
