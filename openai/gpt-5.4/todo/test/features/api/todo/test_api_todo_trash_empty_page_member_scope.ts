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

export async function test_api_todo_trash_empty_page_member_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!password",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const otherMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!password",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const memberTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: `member-trash-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(memberTodo);
  const otherMemberTodo = await generate_random_todo_app_member_todos_create(
    otherMemberConnection,
    {
      body: {
        title: `other-trash-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(otherMemberTodo);
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: memberTodo.id,
  });
  await api.functional.todoApp.member.todos.erase(otherMemberConnection, {
    todoId: otherMemberTodo.id,
  });
  const firstPageRequest = {
    page: 1,
    limit: 10,
    completed: "all",
    sort: "created_at_desc",
  } satisfies ITodoAppTodo.IRequest;
  const firstPage = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: firstPageRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "member first page contains own trashed todo",
    ArrayUtil.has(firstPage.data, (todo) => todo.id === memberTodo.id),
  );
  TestValidator.predicate(
    "member first page excludes other member trashed todo",
    !ArrayUtil.has(firstPage.data, (todo) => todo.id === otherMemberTodo.id),
  );
  const emptyPageRequest = {
    page: 2,
    limit: 10,
    completed: "all",
    sort: "created_at_desc",
  } satisfies ITodoAppTodo.IRequest;
  const emptyPage = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: emptyPageRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("empty page data length", emptyPage.data.length, 0);
  TestValidator.equals(
    "empty page current pagination preserved",
    emptyPage.pagination.current,
    emptyPageRequest.page,
  );
  TestValidator.equals(
    "empty page limit pagination preserved",
    emptyPage.pagination.limit,
    emptyPageRequest.limit,
  );
}
