import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random private multi-user todo creation data for E2E testing.
 *
 * Generates a complete IMultiUserTodoTodo.ICreate payload with realistic
 * title/description text and optional ISO-8601 date-time scheduling fields.
 */
export function prepare_random_multi_user_todo_todo(
  input?: DeepPartial<IMultiUserTodoTodo.ICreate> | undefined,
): IMultiUserTodoTodo.ICreate {
  const now = new Date();
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 }),
    description:
      input?.description !== undefined
        ? (input.description ?? null)
        : RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 3,
            wordMin: 4,
            wordMax: 10,
          }),
    startDate:
      input?.startDate !== undefined
        ? (input.startDate ?? null)
        : (RandomGenerator.date(now, 1000 * 60 * 60 * 24 * 30).toISOString() as
            | (string & tags.Format<"date-time">)
            | null),
    dueDate:
      input?.dueDate !== undefined
        ? (input.dueDate ?? null)
        : (RandomGenerator.date(now, 1000 * 60 * 60 * 24 * 60).toISOString() as
            | (string & tags.Format<"date-time">)
            | null),
  };
}
