import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_todo_app_member_password_reset } from "../prepare/prepare_random_todo_app_member_password_reset";

export async function generate_random_todo_app_member_password_resets_request_reset(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppMemberPasswordReset.ICreate> | undefined;
  },
): Promise<ITodoAppMemberPasswordReset.ICreated> {
  const prepared: ITodoAppMemberPasswordReset.ICreate =
    prepare_random_todo_app_member_password_reset(props.body);
  const result: ITodoAppMemberPasswordReset.ICreated =
    await api.functional.todoApp.member.password_resets.requestReset(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
