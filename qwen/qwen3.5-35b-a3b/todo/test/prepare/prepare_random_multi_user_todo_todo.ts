import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random todo item creation data for E2E testing.
 *
 * Generates a complete IMultiUserTodoTodo.ICreate with randomized values for
 * title, description, start_date, and due_date. The title is randomly generated
 * with 3-5 words to stay within the 255 character limit. Description uses 2
 * paragraphs with 5-10 sentences each for realistic content. Dates are generated
 * as ISO 8601 formatted date-time strings. All properties support input override
 * through DeepPartial for test customization.
 */
export function prepare_random_multi_user_todo_todo(
  input?: DeepPartial<IMultiUserTodoTodo.ICreate> | undefined,
): IMultiUserTodoTodo.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: RandomGenerator.pick([3, 4, 5]) }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    due_date:
      input?.due_date ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
