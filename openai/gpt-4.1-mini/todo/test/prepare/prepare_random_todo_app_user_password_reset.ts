import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
export function prepare_random_todo_app_user_password_reset(
  input?: DeepPartial<ITodoAppUserPasswordReset.ICreate>,
): ITodoAppUserPasswordReset.ICreate {
  return {
    todo_app_user_id:
      input?.todo_app_user_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
