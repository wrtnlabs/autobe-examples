import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
export function prepare_random_todo_app_todo(
  input?: DeepPartial<ITodoAppTodo.ICreate>,
): ITodoAppTodo.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
        >(),
        wordMin: 3,
        wordMax: 7,
      }),
    description:
      input?.description ??
      (RandomGenerator.pick([true, false] as const)
        ? RandomGenerator.content({
            paragraphs: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
            >(),
          })
        : null),
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "medium", "high"] as const),
    due_date:
      input?.due_date ??
      RandomGenerator.date(new Date(), 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
