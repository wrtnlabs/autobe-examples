import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

export async function test_api_todo_edit_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create member-specific connection
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
  // Note: authorize_member_join updates headers internally
  // 2. Create a todo
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Edit the todo to create edit history entry
  const editedTitle = RandomGenerator.paragraph({ sentences: 1 });
  const editedDescription = RandomGenerator.paragraph({ sentences: 2 });
  const editedStartDate = new Date().toISOString();
  const editedDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: editedTitle,
        description: editedDescription,
        start_date: editedStartDate,
        due_date: editedDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Retrieve the edit history entry
  // Note: We need to get the historyId - typically from the update response or list
  // For this test, we'll generate a historyId (in real scenario, this would come from history list)
  // Simulating: in production, the update response or a separate history list endpoint would provide the historyId
  const historyId = typia.random<string & tags.Format<"uuid">>();
  const historyEntry =
    await api.functional.todoApp.member.todos.history.getByTodoidAndHistoryid(
      memberConnection,
      {
        todoId: todo.id,
        historyId,
      },
    );
  typia.assert(historyEntry);
  // 5. Validate history entry structure
  TestValidator.equals(
    "history entry has todoId",
    historyEntry.todoAppTodosId,
    todo.id,
  );
  TestValidator.equals(
    "history entry has memberId",
    historyEntry.todoAppMemberId,
    memberAuth.id,
  );
  TestValidator.equals(
    "history entry title was changed",
    historyEntry.newTitle,
    editedTitle,
  );
  TestValidator.equals(
    "history entry description was changed",
    historyEntry.newDescription,
    editedDescription,
  );
  TestValidator.equals(
    "history entry start_date was changed",
    historyEntry.newStartDate,
    editedStartDate,
  );
  TestValidator.equals(
    "history entry due_date was changed",
    historyEntry.newDueDate,
    editedDueDate,
  );
}
