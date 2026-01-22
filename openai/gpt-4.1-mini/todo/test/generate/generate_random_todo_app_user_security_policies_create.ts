import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppSecurityPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSecurityPolicy";
import { prepare_random_todo_app_security_policy } from "../prepare/prepare_random_todo_app_security_policy";
export async function generate_random_todo_app_user_security_policies_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppSecurityPolicy.ICreate> | undefined;
  },
): Promise<ITodoAppSecurityPolicy> {
  const prepared: ITodoAppSecurityPolicy.ICreate =
    prepare_random_todo_app_security_policy(props.body);
  return await api.functional.todoApp.user.security_policies.create(
    connection,
    {
      body: prepared,
    },
  );
}
