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

export async function test_api_todo_trash_list_with_deleted_todos(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create multiple todos with varying properties
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
        start_date: new Date().toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  const todo3 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);
  const todo4 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo4);
  // 3. Soft delete some todos (todo1, todo2, todo3) to populate trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo1.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo2.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo3.id,
  });
  // 4. Call trash list endpoint with deleted=true filter
  const trashList = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        deleted: true,
        page: 1,
        limit: 10,
        sort: "created_at",
        direction: "DESC",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashList);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    trashList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    trashList.pagination.limit >= 3,
  );
  TestValidator.equals(
    "pagination records count",
    trashList.pagination.records,
    3,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    trashList.pagination.pages >= 1,
  );
  // 6. Validate trash contains only deleted todos (deleted_at is not null)
  TestValidator.equals("trash list has 3 items", trashList.data.length, 3);
  for (const todo of trashList.data) {
    TestValidator.predicate(
      "todo has deleted_at timestamp",
      todo.deleted_at !== null,
    );
  }
  // 7. Validate active todo (todo4) is excluded from trash
  const activeTodoInTrash = trashList.data.find((t) => t.id === todo4.id);
  TestValidator.equals(
    "active todo not in trash",
    activeTodoInTrash,
    undefined,
  );
  // 8. Validate todo summaries include member ownership information
  for (const todo of trashList.data) {
    TestValidator.predicate("todo has member info", todo.member !== undefined);
    TestValidator.predicate("member has id", todo.member.id !== undefined);
    TestValidator.predicate(
      "member has display_name",
      todo.member.display_name !== undefined,
    );
  }
  // 9. Test sorting by title ASC
  const trashByTitleAsc = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        deleted: true,
        sort: "title",
        direction: "ASC",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashByTitleAsc);
  TestValidator.equals(
    "trash by title ASC has 3 items",
    trashByTitleAsc.data.length,
    3,
  );
  // 10. Test sorting by completed DESC
  const trashByCompletedDesc =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: {
        deleted: true,
        sort: "completed",
        direction: "DESC",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(trashByCompletedDesc);
  TestValidator.equals(
    "trash by completed DESC has 3 items",
    trashByCompletedDesc.data.length,
    3,
  );
  // 11. Test pagination with different page size
  const trashSmallPage = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        deleted: true,
        page: 1,
        limit: 2,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashSmallPage);
  TestValidator.equals("small page has 2 items", trashSmallPage.data.length, 2);
  TestValidator.equals(
    "small page records still 3",
    trashSmallPage.pagination.records,
    3,
  );
  TestValidator.equals(
    "small page has 2 pages",
    trashSmallPage.pagination.pages,
    2,
  );
}
