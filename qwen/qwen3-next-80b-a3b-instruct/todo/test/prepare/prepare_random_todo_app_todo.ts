import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_todo_app_todo(
  input?: DeepPartial<ITodoAppTodo.ICreate> | undefined,
): ITodoAppTodo.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        wordMin: 2,
        wordMax: 8,
      }),
    description:
      input?.description ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<50>
        >(),
        wordMin: 3,
        wordMax: 7,
      }),
    start_date:
      input?.start_date ??
      RandomGenerator.date(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        90 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    due_date:
      input?.due_date ??
      RandomGenerator.date(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        90 * 24 * 60 * 60 * 1000,
      ).toISOString(),
  };
}