import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoViewStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_multi_user_todo_todo_view_stat(
  input?: DeepPartial<IMultiUserTodoTodoViewStat.ICreate> | undefined,
): IMultiUserTodoTodoViewStat.ICreate {
  const view_type =
    input?.view_type ?? RandomGenerator.pick(["list", "detail"] as const);
  const multi_user_todo_todo_id = (() => {
    // Handle input override first
    if (input?.multi_user_todo_todo_id !== undefined) {
      return input.multi_user_todo_todo_id;
    }
    // Generate based on view_type
    return view_type === "list"
      ? null
      : typia.random<string & tags.Format<"uuid">>();
  })();
  return {
    view_type,
    multi_user_todo_todo_id,
  };
}
