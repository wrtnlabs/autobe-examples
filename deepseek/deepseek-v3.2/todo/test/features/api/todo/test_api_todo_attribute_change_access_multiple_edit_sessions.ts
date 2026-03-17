import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import type { ITodoAppTodoHistoryAttributeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryAttributeChange";
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
 * Test scenario for accessing attribute change with multiple todo edits over time.
 * 1. Register a member user and authenticate.
 * 2. Create an initial todo.
 * 3. Perform three distinct edits (title, description, due date).
 * 4. Retrieve edit histories to verify edit sessions were recorded.
 * Note: Cannot test specific attribute change access without attributeChangeId,
 * but demonstrates the multiple edit history creation workflow.
 */
export async function test_api_todo_attribute_change_access_multiple_edit_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create initial todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  const todoId = todo.id;
  // 3. First edit: update title
  const newTitle = RandomGenerator.paragraph({ sentences: 1 });
  const afterTitleUpdate = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId,
      body: {
        title: newTitle,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(afterTitleUpdate);
  TestValidator.equals("title updated", afterTitleUpdate.title, newTitle);
  // 4. Second edit: update description
  const newDescription = RandomGenerator.paragraph({ sentences: 4 });
  const afterDescriptionUpdate =
    await api.functional.todoApp.member.todos.update(memberConnection, {
      todoId,
      body: {
        description: newDescription,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(afterDescriptionUpdate);
  TestValidator.equals(
    "description updated",
    afterDescriptionUpdate.description,
    newDescription,
  );
  // 5. Third edit: update due date
  const newDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const afterDueDateUpdate = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId,
      body: {
        due_date: newDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(afterDueDateUpdate);
  TestValidator.equals(
    "due date updated",
    afterDueDateUpdate.due_date,
    newDueDate,
  );
  // 6. Retrieve edit histories to verify three edit sessions were recorded
  const histories = await api.functional.todoApp.member.todos.histories.index(
    memberConnection,
    {
      todoId,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(histories);
  TestValidator.predicate(
    "has at least 3 histories",
    histories.data.length >= 3,
  );
  // Verify history ordering (most recent first)
  for (let i = 0; i < histories.data.length - 1; i++) {
    const current = new Date(histories.data[i].created_at);
    const next = new Date(histories.data[i + 1].created_at);
    TestValidator.predicate(
      `history ${i} is newer than ${i + 1}`,
      current >= next,
    );
  }
  // Note: Cannot test attribute change endpoint without attributeChangeId
  // The endpoint GET /todoApp/member/todos/{todoId}/histories/{historyId}/attribute-changes/{attributeChangeId}
  // requires an attributeChangeId which is not obtainable from available APIs.
}
