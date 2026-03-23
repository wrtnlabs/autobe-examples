import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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

export async function test_api_trash_listing_with_pagination_and_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  const memberSession = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(memberSession);
  // 2. Create multiple todos with various states
  const todos: ITodoAppTodo[] = [];
  // Create some active todos
  for (let i = 0; i < 3; i++) {
    const todo = await generate_random_todo_app_member_todos_create(
      memberConnection,
      {
        body: {
          title: `Active Todo ${i}`,
          description: `Description for active todo ${i}`,
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    todos.push(todo);
  }
  // Create some completed todos
  for (let i = 0; i < 3; i++) {
    const todo = await generate_random_todo_app_member_todos_create(
      memberConnection,
      {
        body: {
          title: `Completed Todo ${i}`,
          description: `Description for completed todo ${i}`,
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    todos.push(todo);
    // Mark as complete via update (if available) or accept default incomplete state
  }
  // 3. Delete specific todos to move them to trash
  const deletedTodo1 = todos[0];
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: deletedTodo1.id,
  });
  const deletedTodo2 = todos[2];
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: deletedTodo2.id,
  });
  const deletedTodo3 = todos[5];
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: deletedTodo3.id,
  });
  // 4. Test trash listing with default parameters
  const defaultTrash = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(defaultTrash);
  // 5. Validate default response structure
  TestValidator.equals("pagination exists", defaultTrash.pagination.current, 1);
  TestValidator.equals("limit exists", defaultTrash.pagination.limit, 20);
  TestValidator.equals("has deleted todos", defaultTrash.data.length, 3);
  // 6. Test trash listing with status filter
  const completeTrash = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        status: "complete" satisfies ITodoAppTodo.IRequest["status"],
      },
    },
  );
  typia.assert(completeTrash);
  const incompleteTrash = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        status: "incomplete" satisfies ITodoAppTodo.IRequest["status"],
      },
    },
  );
  typia.assert(incompleteTrash);
  // 7. Test trash listing with sorting
  const sortByCreatedAtDesc = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        sort: "createdAt" satisfies ITodoAppTodo.IRequest["sort"],
        direction: "desc" satisfies ITodoAppTodo.IRequest["direction"],
      },
    },
  );
  typia.assert(sortByCreatedAtDesc);
  const sortByCreatedAtAsc = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        sort: "createdAt" satisfies ITodoAppTodo.IRequest["sort"],
        direction: "asc" satisfies ITodoAppTodo.IRequest["direction"],
      },
    },
  );
  typia.assert(sortByCreatedAtAsc);
  // 8. Test trash listing with pagination
  const firstPage = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    },
  );
  typia.assert(firstPage);
  TestValidator.equals("first page count", firstPage.data.length, 2);
  TestValidator.equals(
    "first page pagination",
    firstPage.pagination.current,
    1,
  );
  const secondPage = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    },
  );
  typia.assert(secondPage);
  TestValidator.equals("second page count", secondPage.data.length, 1);
  TestValidator.equals(
    "second page pagination",
    secondPage.pagination.current,
    2,
  );
  // 9. Test user-level isolation - create another user and verify they can't see our trash
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMemberSession = await authorize_member_join(
    otherMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppMemberSession.IJoin,
    },
  );
  typia.assert(otherMemberSession);
  const otherMemberTrash = await api.functional.todoApp.member.trash.index(
    otherMemberConnection,
    {
      body: {},
    },
  );
  typia.assert(otherMemberTrash);
  TestValidator.equals(
    "other user trash empty",
    otherMemberTrash.data.length,
    0,
  );
}