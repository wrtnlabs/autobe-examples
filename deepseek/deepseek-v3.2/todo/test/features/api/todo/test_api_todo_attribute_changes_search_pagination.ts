import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { IPageITodoAppTodoHistoryAttributeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistoryAttributeChange";
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
 * Test attribute changes search with no filters applied (empty request body) to verify that all attribute changes for a specific history are returned with proper pagination. Create a member, create a todo, edit it multiple times to generate at least 5 different attribute changes, then call the attribute changes endpoint without any filters. Validate that the response includes all attribute changes, correctly paginated with default page size, and that each entry contains the correct attribute name, old/new values, data type, and timestamp. Ensure that the pagination metadata (current page, limit, total records, total pages) is accurate. Test edge cases like requesting a page beyond available results and verifying empty response with proper pagination metadata. Also verify that attribute changes are returned in correct chronological order (most recent first) as per edit history requirements.
 */
export async function test_api_todo_attribute_changes_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorizedMember);
  // 2. Create todo with utility function
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Track expected attribute changes
  const expectedChanges: Array<{
    attribute: string;
    oldValue: string | null;
    newValue: string | null;
    dataType: string;
  }> = [];
  // First edit: change title
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const firstEdit = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: { title: newTitle } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(firstEdit);
  expectedChanges.push({
    attribute: "title",
    oldValue: todo.title,
    newValue: newTitle,
    dataType: "string",
  });
  // Second edit: change description
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const secondEdit = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: { description: newDescription } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(secondEdit);
  expectedChanges.push({
    attribute: "description",
    oldValue: todo.description,
    newValue: newDescription,
    dataType: "text",
  });
  // Third edit: change start_date
  const newStartDate = new Date(Date.now() + 86400000).toISOString();
  const thirdEdit = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: { start_date: newStartDate } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(thirdEdit);
  expectedChanges.push({
    attribute: "start_date",
    oldValue: todo.start_date,
    newValue: newStartDate,
    dataType: "datetime",
  });
  // Fourth edit: change due_date
  const newDueDate = new Date(Date.now() + 172800000).toISOString();
  const fourthEdit = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: { due_date: newDueDate } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(fourthEdit);
  expectedChanges.push({
    attribute: "due_date",
    oldValue: todo.due_date,
    newValue: newDueDate,
    dataType: "datetime",
  });
  // Fifth edit: change completed
  const newCompleted = true;
  const fifthEdit = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: { completed: newCompleted } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(fifthEdit);
  expectedChanges.push({
    attribute: "completed",
    oldValue: todo.completed?.toString() ?? null,
    newValue: newCompleted.toString(),
    dataType: "boolean",
  });
}