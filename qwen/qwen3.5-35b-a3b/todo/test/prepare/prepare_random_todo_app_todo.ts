import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_todo_app_todo(
  input?: DeepPartial<ITodoAppTodo.ICreate>,
): ITodoAppTodo.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 1 }),
    start_date:
      input?.start_date ??
      RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24 * 30).toISOString(),
    due_date:
      input?.due_date ??
      RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24 * 30).toISOString(),
  };
}
