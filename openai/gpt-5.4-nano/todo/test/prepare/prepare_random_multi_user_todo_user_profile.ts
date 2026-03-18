import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_multi_user_todo_user_profile(
  input?: DeepPartial<IMultiUserTodoUserProfile.ICreate> | undefined,
): IMultiUserTodoUserProfile.ICreate {
  return {
    display_name: input?.display_name ?? RandomGenerator.name(),
  };
}
