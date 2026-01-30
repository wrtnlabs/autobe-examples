import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
export function prepare_random_todo_app_todo_item(
  input?: DeepPartial<ITodoAppTodoItem.ICreate>,
): ITodoAppTodoItem.ICreate {
  return {
    completed:
      input?.completed ?? RandomGenerator.pick([true, false, null] as const),
    text:
      input?.text ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 2,
        wordMax: 5,
      }),
  };
}
