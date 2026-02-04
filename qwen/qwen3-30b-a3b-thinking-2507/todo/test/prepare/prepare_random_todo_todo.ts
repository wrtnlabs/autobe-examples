import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
export function prepare_random_todo_todo(
  input?: DeepPartial<ITodoTodo.ICreate>,
): ITodoTodo.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({
        sentences: typia.random<number>(),
      }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: typia.random<number>(),
      }),
    start_date:
      input?.start_date ??
      new Date(
        Date.now() - typia.random<number>() * 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    due_date:
      input?.due_date ??
      new Date(
        Date.now() + typia.random<number>() * 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
  };
}