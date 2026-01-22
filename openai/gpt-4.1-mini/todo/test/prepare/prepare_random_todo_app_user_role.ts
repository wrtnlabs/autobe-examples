import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserRole";
export function prepare_random_todo_app_user_role(
  input?: DeepPartial<ITodoAppUserRole.ICreate>,
): ITodoAppUserRole.ICreate {
  return {
    todo_app_role_id:
      input?.todo_app_role_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
