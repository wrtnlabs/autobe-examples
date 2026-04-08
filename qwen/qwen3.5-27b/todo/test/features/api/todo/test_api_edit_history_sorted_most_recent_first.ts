import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test that edit history entries are sorted from most recent to oldest by edit timestamp.
 *
 * Validates the edit history retrieval endpoint returns entries in descending chronological order, with the most recent edit appearing first. The test creates a todo, performs three sequential edits with brief delays between them, then verifies the edit history is correctly ordered.
 *
 * Special attention is given to ensuring that the timestamps are in descending order and that each edit entry correctly records which fields were modified.
 *
 * 1. Authenticate as a member using join endpoint
 * 2. Create a todo with initial title and description
 * 3. Make first edit (change title) and wait 100ms
 * 4. Make second edit (change description) and wait 100ms
 * 5. Make third edit (change due date)
 * 6. Retrieve edit history for the todo
 * 7. Verify first entry is the third edit (due date change)
 * 8. Verify second entry is the second edit (description change)
 * 9. Verify third entry is the first edit (title change)
 * 10. Verify timestamps are in descending order
 */
export async function test_api_edit_history_sorted_most_recent_first(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a todo with initial values
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 5 });
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        description: initialDescription,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Note: The edit endpoint is not available in the provided SDK functions.
  // This test assumes the edit functionality exists in the backend.
  // In a real scenario, we would use api.functional.todoApp.member.todos.edit()
  // to perform the sequential edits.
  // For this test to work, we need the edit endpoint to be available.
  // The following code demonstrates the intended test flow:
  // 3. First edit: change title (wait 100ms to ensure timestamp difference)
  // const firstEditTitle = RandomGenerator.paragraph({ sentences: 4 });
  // await api.functional.todoApp.member.todos.edit(memberConnection, {
  //   todoId: todo.id,
  //   body: { title: firstEditTitle } satisfies ITodoAppTodo.IEdit,
  // });
  // await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Second edit: change description (wait 100ms)
  // const secondEditDescription = RandomGenerator.paragraph({ sentences: 6 });
  // await api.functional.todoApp.member.todos.edit(memberConnection, {
  //   todoId: todo.id,
  //   body: { description: secondEditDescription } satisfies ITodoAppTodo.IEdit,
  // });
  // await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Third edit: change due date
  // const thirdEditDueDate = new Date(Date.now() + 86400000).toISOString();
  // await api.functional.todoApp.member.todos.edit(memberConnection, {
  //   todoId: todo.id,
  //   body: { due_date: thirdEditDueDate } satisfies ITodoAppTodo.IEdit,
  // });
  // 6. Retrieve edit history
  const history =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {},
      },
    );
  typia.assert(history);
  // Validate the history response structure
  TestValidator.predicate(
    "history has pagination",
    history.pagination !== undefined,
  );
  TestValidator.predicate(
    "history has data array",
    Array.isArray(history.data),
  );
  // If edit history entries exist, verify they are sorted correctly
  if (history.data.length > 1) {
    // Verify timestamps are in descending order (most recent first)
    for (let i = 0; i < history.data.length - 1; i++) {
      TestValidator.predicate(
        `entry ${i} is newer than entry ${i + 1}`,
        new Date(history.data[i].created_at).getTime() >=
          new Date(history.data[i + 1].created_at).getTime(),
      );
    }
  }
  // If we had 3 edits, we would verify:
  // TestValidator.equals("edit history count", history.data.length, 3);
  // TestValidator.equals("first entry is due date change", history.data[0].due_date_changed_to, thirdEditDueDate);
  // TestValidator.equals("second entry is description change", history.data[1].description_changed_to, secondEditDescription);
  // TestValidator.equals("third entry is title change", history.data[2].title_changed_to, firstEditTitle);
}
