import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
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

/**
 * Test that members can sort their trash list by different date fields with proper NULL value handling.
 *
 * Test Steps:
 * 1. Authenticate as a member via join
 * 2. Create multiple todos with varying started_at and due_at values (some with dates, some without)
 * 3. Delete all todos to move them to trash
 * 4. Call trash endpoint with sort='created_at' and order='asc', verify oldest first
 * 5. Call trash endpoint with sort='created_at' and order='desc', verify newest first
 * 6. Call trash endpoint with sort='started_at', verify todos without start dates appear at end
 * 7. Call trash endpoint with sort='due_at', verify todos without due dates appear at the end
 * 8. Verify sorting works correctly in both ascending and descending order for each field
 */
export async function test_api_trash_sorting_with_null_date_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create multiple todos with varying date values
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  // Todo 1: All dates set (oldest)
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        started_at: new Date(now.getTime() - 3 * day).toISOString(),
        due_at: new Date(now.getTime() + 3 * day).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  // Wait a bit to ensure different created_at
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Todo 2: All dates set (middle)
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        started_at: new Date(now.getTime() - 2 * day).toISOString(),
        due_at: new Date(now.getTime() + 2 * day).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  // Wait a bit to ensure different created_at
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Todo 3: No started_at, has due_at (newest)
  const todo3 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        started_at: null,
        due_at: new Date(now.getTime() + 1 * day).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);
  // Wait a bit to ensure different created_at
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Todo 4: Has started_at, no due_at
  const todo4 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        started_at: new Date(now.getTime() - 1 * day).toISOString(),
        due_at: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo4);
  // Wait a bit to ensure different created_at
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Todo 5: No dates at all
  const todo5 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        started_at: null,
        due_at: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo5);
  const todos = [todo1, todo2, todo3, todo4, todo5];
  // 3. Delete all todos to move them to trash
  for (const todo of todos) {
    await api.functional.todoApp.member.todos.erase(memberConnection, {
      todoId: todo.id,
    });
  }
  // 4. Test sorting by created_at ascending
  const trashCreatedAsc = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        sort: "created_at",
        order: "asc",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashCreatedAsc);
  TestValidator.equals(
    "trash count created_at asc",
    trashCreatedAsc.data.length,
    5,
  );
  // Verify created_at order (oldest first)
  for (let i = 1; i < trashCreatedAsc.data.length; i++) {
    const prevDate = new Date(trashCreatedAsc.data[i - 1].created_at).getTime();
    const currDate = new Date(trashCreatedAsc.data[i].created_at).getTime();
    TestValidator.predicate(
      `created_at asc order [${i - 1}] <= [${i}]`,
      prevDate <= currDate,
    );
  }
  // 5. Test sorting by created_at descending
  const trashCreatedDesc =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: {
        sort: "created_at",
        order: "desc",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(trashCreatedDesc);
  TestValidator.equals(
    "trash count created_at desc",
    trashCreatedDesc.data.length,
    5,
  );
  // Verify created_at order (newest first)
  for (let i = 1; i < trashCreatedDesc.data.length; i++) {
    const prevDate = new Date(
      trashCreatedDesc.data[i - 1].created_at,
    ).getTime();
    const currDate = new Date(trashCreatedDesc.data[i].created_at).getTime();
    TestValidator.predicate(
      `created_at desc order [${i - 1}] >= [${i}]`,
      prevDate >= currDate,
    );
  }
  // 6. Test sorting by started_at ascending (nulls at end)
  const trashStartedAsc = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        sort: "started_at",
        order: "asc",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashStartedAsc);
  TestValidator.equals(
    "trash count started_at asc",
    trashStartedAsc.data.length,
    5,
  );
  // Verify nulls are at the end
  let nullStartedFound = false;
  for (const todo of trashStartedAsc.data) {
    if (todo.started_at === null) {
      nullStartedFound = true;
    } else if (nullStartedFound) {
      throw new Error(
        "started_at null handling failed: Non-null started_at found after null in asc order",
      );
    }
  }
  // 7. Test sorting by started_at descending (nulls at end)
  const trashStartedDesc =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: {
        sort: "started_at",
        order: "desc",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(trashStartedDesc);
  TestValidator.equals(
    "trash count started_at desc",
    trashStartedDesc.data.length,
    5,
  );
  // Verify nulls are at the end for desc too
  nullStartedFound = false;
  for (const todo of trashStartedDesc.data) {
    if (todo.started_at === null) {
      nullStartedFound = true;
    } else if (nullStartedFound) {
      throw new Error(
        "started_at null handling failed: Non-null started_at found after null in desc order",
      );
    }
  }
  // 8. Test sorting by due_at ascending (nulls at end)
  const trashDueAsc = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        sort: "due_at",
        order: "asc",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashDueAsc);
  TestValidator.equals("trash count due_at asc", trashDueAsc.data.length, 5);
  // Verify nulls are at the end
  let nullDueFound = false;
  for (const todo of trashDueAsc.data) {
    if (todo.due_at === null) {
      nullDueFound = true;
    } else if (nullDueFound) {
      throw new Error(
        "due_at null handling failed: Non-null due_at found after null in asc order",
      );
    }
  }
  // 9. Test sorting by due_at descending (nulls at end)
  const trashDueDesc = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        sort: "due_at",
        order: "desc",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashDueDesc);
  TestValidator.equals("trash count due_at desc", trashDueDesc.data.length, 5);
  // Verify nulls are at the end for desc too
  nullDueFound = false;
  for (const todo of trashDueDesc.data) {
    if (todo.due_at === null) {
      nullDueFound = true;
    } else if (nullDueFound) {
      throw new Error(
        "due_at null handling failed: Non-null due_at found after null in desc order",
      );
    }
  }
  // 10. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    trashCreatedAsc.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    trashCreatedAsc.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records",
    trashCreatedAsc.pagination.records,
    5,
  );
  TestValidator.equals("pagination pages", trashCreatedAsc.pagination.pages, 1);
}
