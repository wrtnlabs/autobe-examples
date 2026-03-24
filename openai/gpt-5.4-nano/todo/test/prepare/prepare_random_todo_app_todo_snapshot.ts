import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_todo_app_todo_snapshot(
  input?: DeepPartial<ITodoAppTodoSnapshot.ICreate> | undefined,
): ITodoAppTodoSnapshot.ICreate {
  const generated_start_date = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60 * 24 * 30,
  ).toISOString() as string & tags.Format<"date-time">;
  const start_date: (string & tags.Format<"date-time">) | null =
    input?.start_date === null
      ? null
      : (input?.start_date ?? generated_start_date);
  const description: string | null =
    input?.description === null
      ? null
      : (input?.description ??
        (RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 1,
          sentenceMax: 2,
          wordMin: 2,
          wordMax: 12,
        }) as string));
  const due_date: (string & tags.Format<"date-time">) | null =
    input?.due_date === null
      ? null
      : input?.due_date !== undefined
        ? (input.due_date as string & tags.Format<"date-time">)
        : start_date === null
          ? (RandomGenerator.date(
              new Date(),
              1000 * 60 * 60 * 24 * 60,
            ).toISOString() as string & tags.Format<"date-time">)
          : (RandomGenerator.date(
              new Date(start_date),
              1000 * 60 * 60 * 24 * 30,
            ).toISOString() as string & tags.Format<"date-time">);
  return {
    title:
      input?.title ??
      (RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 1,
        wordMax: 8,
      }) as string),
    description,
    start_date,
    due_date,
    completion_status: input?.completion_status ?? typia.random<boolean>(),
  };
}
