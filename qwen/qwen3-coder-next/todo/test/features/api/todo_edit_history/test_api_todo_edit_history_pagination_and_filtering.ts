import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEdit";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEdit";
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

export async function test_api_todo_edit_history_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberSession = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(memberSession);
  // 2. Create a todo item
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Make multiple edits at different timestamps
  const edits = ArrayUtil.repeat(5, async (index) => {
    await api.functional.todoApp.member.todos.update(memberConnection, {
      todoId: todo.id,
      body: {
        title: `Updated title ${index + 1}`,
        description: `Updated description ${index + 1}`,
      } satisfies ITodoAppTodo.IUpdate,
    });
  });
  await Promise.all(edits);
  // Wait a moment to ensure timestamp differences
  await new Promise((resolve) => setTimeout(resolve, 100));
  await api.functional.todoApp.member.todos.update(memberConnection, {
    todoId: todo.id,
    body: {
      title: "Final title",
      description: "Final description",
    } satisfies ITodoAppTodo.IUpdate,
  });
  // 4. Test pagination with different page sizes
  // Test with limit=2
  const page1 = await api.functional.todoApp.member.todos.histories.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        limit: 2,
        page: 1,
      } satisfies ITodoAppTodoEdit.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("first page has 2 records", page1.data.length, 2);
  TestValidator.equals(
    "pagination metadata correct",
    page1.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination records correct",
    page1.pagination.records,
    6,
  );
  TestValidator.equals(
    "pagination current correct",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("pagination pages correct", page1.pagination.pages, 3);
  // Test second page
  const page2 = await api.functional.todoApp.member.todos.histories.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        limit: 2,
        page: 2,
      } satisfies ITodoAppTodoEdit.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.notEquals(
    "different records on different pages",
    page1.data[0].id,
    page2.data[0].id,
  );
  // 5. Test with limit=1 (single record)
  const singlePage = await api.functional.todoApp.member.todos.histories.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        limit: 1,
        page: 1,
      } satisfies ITodoAppTodoEdit.IRequest,
    },
  );
  typia.assert(singlePage);
  TestValidator.equals("single page has 1 record", singlePage.data.length, 1);
  TestValidator.equals(
    "pagination pages for 6 records with limit 1",
    singlePage.pagination.pages,
    6,
  );
  // 6. Test with max limit=100
  const maxLimitPage =
    await api.functional.todoApp.member.todos.histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          limit: 100,
          page: 1,
        } satisfies ITodoAppTodoEdit.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page returns all records",
    maxLimitPage.data.length,
    6,
  );
  // 7. Test timestamp filtering using actual timestamps from API
  const allHistory = await api.functional.todoApp.member.todos.histories.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodoEdit.IRequest,
    },
  );
  typia.assert(allHistory);
  if (allHistory.data.length >= 3) {
    // Use actual timestamps from API responses
    const minTimestamp = allHistory.data[2].edited_at;
    const maxTimestamp = allHistory.data[0].edited_at;
    const filteredByMin =
      await api.functional.todoApp.member.todos.histories.index(
        memberConnection,
        {
          todoId: todo.id,
          body: {
            edited_at_min: minTimestamp,
            limit: 10,
          } satisfies ITodoAppTodoEdit.IRequest,
        },
      );
    typia.assert(filteredByMin);
    TestValidator.predicate(
      "filtered results from min timestamp",
      filteredByMin.data.length >= 1,
    );
    const filteredByMax =
      await api.functional.todoApp.member.todos.histories.index(
        memberConnection,
        {
          todoId: todo.id,
          body: {
            edited_at_max: maxTimestamp,
            limit: 10,
          } satisfies ITodoAppTodoEdit.IRequest,
        },
      );
    typia.assert(filteredByMax);
    TestValidator.predicate(
      "filtered results up to max timestamp",
      filteredByMax.data.length >= 1,
    );
  }
  // 8. Test edge cases
  // Empty page beyond available data
  const emptyPage = await api.functional.todoApp.member.todos.histories.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        page: 100,
        limit: 5,
      } satisfies ITodoAppTodoEdit.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty page returns no records",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "empty page pagination correct",
    emptyPage.pagination.current,
    100,
  );
  // 9. Verify edit history is sorted from most recent to oldest
  for (let i = 0; i < allHistory.data.length - 1; i++) {
    TestValidator.predicate(
      `edit ${i} is more recent than edit ${i + 1}`,
      allHistory.data[i].edited_at >= allHistory.data[i + 1].edited_at,
    );
  }
  // 10. Verify edit history content (previous and new values)
  const historyWithChanges = allHistory.data.filter(
    (edit) => edit.previous_title !== null || edit.new_title !== null,
  );
  TestValidator.predicate(
    "has edits with title changes",
    historyWithChanges.length >= 1,
  );
  // Verify some edits have title changes
  const titleChangedEdits = allHistory.data.filter(
    (edit) => edit.previous_title !== null && edit.new_title !== null,
  );
  TestValidator.predicate(
    "has edits with title changes",
    titleChangedEdits.length >= 1,
  );
}
