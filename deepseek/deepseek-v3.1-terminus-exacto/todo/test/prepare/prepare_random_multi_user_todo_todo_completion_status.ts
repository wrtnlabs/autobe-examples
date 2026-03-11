import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoCompletionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoCompletionStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_multi_user_todo_todo_completion_status(
  input?: DeepPartial<IMultiUserTodoTodoCompletionStatus.ICreate>,
): IMultiUserTodoTodoCompletionStatus.ICreate {
  return {
    is_completed: input?.is_completed ?? typia.random<boolean>(),
  };
}
