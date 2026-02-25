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
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 6 }),
    description:
      input?.description ??
      (Math.random() < 0.5
        ? RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 })
        : null),
    startDate:
      input?.startDate ??
      (Math.random() < 0.5
        ? RandomGenerator.date(
            new Date(),
            1000 * 60 * 60 * 24 * 30,
          ).toISOString()
        : null),
    dueDate:
      input?.dueDate ??
      (Math.random() < 0.5
        ? RandomGenerator.date(
            new Date(),
            1000 * 60 * 60 * 24 * 60,
          ).toISOString()
        : null),
  };
}