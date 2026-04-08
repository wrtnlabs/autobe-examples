import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random todo creation data for E2E testing.
 *
 * Generates a complete ITodoAppTodo.ICreate with randomized values for all
 * properties. The title is generated as a concise paragraph, description as
 * multi-sentence content, and dates as ISO 8601 formatted date-time strings.
 *
 * All optional properties (description, start_date, due_date) support input
 * override through DeepPartial, allowing test customization while providing
 * sensible defaults for automatic generation.
 */
export function prepare_random_todo_app_todo(
  input?: DeepPartial<ITodoAppTodo.ICreate>,
): ITodoAppTodo.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 4,
      }),
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    due_date:
      input?.due_date ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
