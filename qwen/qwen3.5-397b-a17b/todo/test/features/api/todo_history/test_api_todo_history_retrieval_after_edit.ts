import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
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
 * Test retrieving a specific todo edit history entry after editing.
 *
 * This test validates the complete history tracking workflow:
 * 1. Member authentication via join
 * 2. Todo creation with initial values
 * 3. Todo update to trigger history entry creation
 * 4. History list retrieval to obtain historyId
 * 5. Specific history entry retrieval and validation
 */
export async function test_api_todo_history_retrieval_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create initial todo
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.content({ paragraphs: 2 });
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        description: initialDescription,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Update todo to trigger history entry creation
  const updatedTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 3 });
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Retrieve history list to obtain historyId
  const historyList = await api.functional.todoApp.member.todos.histories.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(historyList);
  // Validate history list has at least one entry
  TestValidator.predicate(
    "history list not empty",
    historyList.data.length > 0,
  );
  // Get the first history entry (most recent edit)
  const historyEntry = historyList.data[0];
  const historyId = historyEntry.id;
  // 5. Retrieve specific history entry
  const specificHistory =
    await api.functional.todoApp.member.todos.histories.at(memberConnection, {
      todoId: todo.id,
      historyId: historyId,
    });
  typia.assert(specificHistory);
  // 6. Validate history entry contents
  TestValidator.equals("todoId matches", specificHistory.todo.id, todo.id);
  TestValidator.predicate(
    "createdAt is valid ISO date",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      specificHistory.createdAt,
    ),
  );
  // Validate changed fields are populated
  TestValidator.equals(
    "newTitle matches update",
    specificHistory.newTitle,
    updatedTitle,
  );
  TestValidator.equals(
    "newDescription matches update",
    specificHistory.newDescription,
    updatedDescription,
  );
  // Validate unchanged fields are null
  TestValidator.equals(
    "newStartDate is null",
    specificHistory.newStartDate,
    null,
  );
  TestValidator.equals("newDueDate is null", specificHistory.newDueDate, null);
  // Validate todo object in history contains current state
  TestValidator.equals(
    "history todo title matches current",
    specificHistory.todo.title,
    updatedTodo.title,
  );
  TestValidator.equals(
    "history todo description matches current",
    specificHistory.todo.description,
    updatedTodo.description,
  );
}
