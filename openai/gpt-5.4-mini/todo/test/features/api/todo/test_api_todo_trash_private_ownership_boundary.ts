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

export async function test_api_todo_trash_private_ownership_boundary(
  connection: api.IConnection,
): Promise<void> {
  const memberOneConnection: api.IConnection = { host: connection.host };
  const memberTwoConnection: api.IConnection = { host: connection.host };
  const memberOne = await api.functional.todoApp.auth.member.join(
    memberOneConnection,
    {
      body: {
        email:
          `${RandomGenerator.alphabets(8)}@example.com` satisfies string as string,
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(memberOne);
  const memberTwo = await api.functional.todoApp.auth.member.join(
    memberTwoConnection,
    {
      body: {
        email:
          `${RandomGenerator.alphabets(8)}@example.com` satisfies string as string,
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(memberTwo);
  const trash = await api.functional.todoApp.member.todos.trash.index(
    memberOneConnection,
    {
      body: {
        completionStatus: "all",
        sort: "createdAtDesc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trash);
  TestValidator.equals("trash current page", trash.pagination.current, 1);
  TestValidator.equals("trash limit", trash.pagination.limit, 10);
  TestValidator.predicate(
    "trash records are non-negative",
    trash.pagination.records >= 0,
  );
  TestValidator.predicate(
    "trash pages are non-negative",
    trash.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "trash results belong to the first member",
    trash.data.every((todo) => todo.member.id === memberOne.id),
  );
  TestValidator.predicate(
    "trash results do not include the second member",
    trash.data.every((todo) => todo.member.id !== memberTwo.id),
  );
}
