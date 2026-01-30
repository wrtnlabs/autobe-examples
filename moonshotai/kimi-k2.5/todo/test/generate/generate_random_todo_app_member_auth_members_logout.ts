import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberLogout } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberLogout";
import { prepare_random_todo_app_member_logout } from "../prepare/prepare_random_todo_app_member_logout";
export async function generate_random_todo_app_member_auth_members_logout(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppMemberLogout.ICreate> | undefined;
  },
): Promise<ITodoAppMemberLogout> {
  const prepared: ITodoAppMemberLogout.ICreate =
    prepare_random_todo_app_member_logout(props.body);
  const result: ITodoAppMemberLogout =
    await api.functional.todoApp.member.auth.members.logout(connection, {
      body: prepared,
    });
  return result;
}
