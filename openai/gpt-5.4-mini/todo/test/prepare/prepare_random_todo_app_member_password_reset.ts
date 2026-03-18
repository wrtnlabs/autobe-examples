import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_todo_app_member_password_reset(
  input?: DeepPartial<ITodoAppMemberPasswordReset.ICreate> | undefined,
): ITodoAppMemberPasswordReset.ICreate {
  return {
    token: input?.token ?? typia.random<string & tags.Format<"uuid">>(),
    password: input?.password ?? typia.random<boolean>(),
  };
}
