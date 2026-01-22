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
import { prepare_random_todo_app_user_role } from "../prepare/prepare_random_todo_app_user_role";
export async function generate_random_todo_app_user_users_roles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppUserRole.ICreate> | undefined;
    params: {
      userId: string;
    };
  },
): Promise<ITodoAppUserRole> {
  const prepared: ITodoAppUserRole.ICreate = prepare_random_todo_app_user_role(
    props.body,
  );
  return await api.functional.todoApp.user.users.roles.create(connection, {
    userId: props.params.userId,
    body: prepared,
  });
}
