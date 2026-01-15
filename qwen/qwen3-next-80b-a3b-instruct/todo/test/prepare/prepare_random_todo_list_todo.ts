import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
export function prepare_random_todo_list_todo(
  input?: DeepPartial<ITodoListTodo.ICreate> | undefined,
): ITodoListTodo.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
        >(),
        wordMin: 3,
        wordMax: 7,
      }),
    details:
      input?.details ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        sentenceMin: 5,
        sentenceMax: 15,
        wordMin: 3,
        wordMax: 8,
      }),
  };
}
