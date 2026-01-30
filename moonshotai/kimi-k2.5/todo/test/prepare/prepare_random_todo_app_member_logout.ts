import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberLogout } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberLogout";
export function prepare_random_todo_app_member_logout(
  input?: DeepPartial<ITodoAppMemberLogout.ICreate>,
): ITodoAppMemberLogout.ICreate {
  return {
    scope: input?.scope ?? RandomGenerator.pick(["current", "all"] as const),
  };
}
