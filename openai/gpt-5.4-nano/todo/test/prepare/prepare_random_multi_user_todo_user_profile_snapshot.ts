import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_multi_user_todo_user_profile_snapshot(
  input?: DeepPartial<IMultiUserTodoUserProfileSnapshot.ICreate>,
): IMultiUserTodoUserProfileSnapshot.ICreate {
  return {
    display_name: input?.display_name ?? RandomGenerator.name(2),
  };
}
