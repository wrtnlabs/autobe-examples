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

export async function test_api_todo_attribute_changes_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create first member connection and account
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member1);
  // Create second member for isolation testing
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member2);
  // Member1 creates a todo
  const todo = await api.functional.todoApp.member.todos.create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // First edit: update title
  const firstUpdate = await api.functional.todoApp.member.todos.update(
    member1Connection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // Second edit: update description
  const secondUpdate = await api.functional.todoApp.member.todos.update(
    member1Connection,
    {
      todoId: todo.id,
      body: {
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // Third edit: update due date
  const thirdUpdate = await api.functional.todoApp.member.todos.update(
    member1Connection,
    {
      todoId: todo.id,
      body: {
        due_date: new Date(Date.now() + 172800000).toISOString(),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(thirdUpdate);
  // Get the edit history
  const histories = await api.functional.todoApp.member.todos.histories.index(
    member1Connection,
    {
      todoId: todo.id,
      body: {
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(histories);
  TestValidator.predicate(
    "should have at least one history",
    histories.data.length > 0,
  );
  const historyId = histories.data[0].id;
  // Test 1: Search for all attribute changes
  const allChanges =
    await api.functional.todoApp.member.todos.histories.attribute_changes.index(
      member1Connection,
      {
        todoId: todo.id,
        historyId,
        body: {
          limit: 10,
          page: 1,
        } satisfies ITodoAppTodoHistoryAttributeChange.IRequest,
      },
    );
  typia.assert(allChanges);
  TestValidator.predicate(
    "should have attribute changes",
    allChanges.data.length > 0,
  );
  // Test 2: Filter by attribute name
  const titleChanges =
    await api.functional.todoApp.member.todos.histories.attribute_changes.index(
      member1Connection,
      {
        todoId: todo.id,
        historyId,
        body: {
          attribute_name: "title",
          limit: 10,
          page: 1,
        } satisfies ITodoAppTodoHistoryAttributeChange.IRequest,
      },
    );
  typia.assert(titleChanges);
  TestValidator.predicate(
    "should have title changes",
    titleChanges.data.length > 0,
  );
  for (const change of titleChanges.data) {
    TestValidator.equals(
      "attribute should be title",
      change.attributeName,
      "title",
    );
  }
  // Test 3: Filter by data type
  const stringChanges =
    await api.functional.todoApp.member.todos.histories.attribute_changes.index(
      member1Connection,
      {
        todoId: todo.id,
        historyId,
        body: {
          data_type: "string",
          limit: 10,
          page: 1,
        } satisfies ITodoAppTodoHistoryAttributeChange.IRequest,
      },
    );
  typia.assert(stringChanges);
  TestValidator.predicate(
    "should have string type changes",
    stringChanges.data.length > 0,
  );
  for (const change of stringChanges.data) {
    TestValidator.equals(
      "data type should be string",
      change.dataType,
      "string",
    );
  }
  // Test 4: Filter by partial value matching
  const partialValue =
    titleChanges.data[0].newValue ?? titleChanges.data[0].oldValue;
  if (partialValue !== null) {
    const searchTerm = partialValue.substring(
      0,
      Math.min(5, partialValue.length),
    );
    const partialMatchChanges =
      await api.functional.todoApp.member.todos.histories.attribute_changes.index(
        member1Connection,
        {
          todoId: todo.id,
          historyId,
          body: {
            new_value: searchTerm,
            limit: 10,
            page: 1,
          } satisfies ITodoAppTodoHistoryAttributeChange.IRequest,
        },
      );
    typia.assert(partialMatchChanges);
    TestValidator.predicate(
      "should find matches",
      partialMatchChanges.data.length > 0,
    );
  }
  // Test 5: Filter by date range
  const dateRangeChanges =
    await api.functional.todoApp.member.todos.histories.attribute_changes.index(
      member1Connection,
      {
        todoId: todo.id,
        historyId,
        body: {
          created_at: {
            from: new Date(Date.now() - 86400000).toISOString(),
            to: new Date(Date.now() + 86400000).toISOString(),
          },
          limit: 10,
          page: 1,
        } satisfies ITodoAppTodoHistoryAttributeChange.IRequest,
      },
    );
  typia.assert(dateRangeChanges);
  // Test 6: Pagination
  const paginatedChanges =
    await api.functional.todoApp.member.todos.histories.attribute_changes.index(
      member1Connection,
      {
        todoId: todo.id,
        historyId,
        body: {
          limit: 1,
          page: 1,
        } satisfies ITodoAppTodoHistoryAttributeChange.IRequest,
      },
    );
  typia.assert(paginatedChanges);
  TestValidator.equals(
    "page limit should be respected",
    paginatedChanges.data.length,
    1,
  );
  TestValidator.predicate(
    "should have pagination info",
    paginatedChanges.pagination.limit === 1,
  );
  // Test 7: Data isolation - member2 should not access member1's todo attribute changes
  await TestValidator.error(
    "member2 cannot access member1's attribute changes",
    async () => {
      await api.functional.todoApp.member.todos.histories.attribute_changes.index(
        member2Connection,
        {
          todoId: todo.id,
          historyId,
          body: {
            limit: 10,
            page: 1,
          } satisfies ITodoAppTodoHistoryAttributeChange.IRequest,
        },
      );
    },
  );
}
