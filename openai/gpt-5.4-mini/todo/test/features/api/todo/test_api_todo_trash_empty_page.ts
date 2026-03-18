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

export async function test_api_todo_trash_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string = `member_${Date.now()}@test.com`;
  const authorized = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email,
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(authorized);
  const output = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "trash pagination current",
    output.pagination.current,
    1,
  );
  TestValidator.equals("trash pagination limit", output.pagination.limit, 10);
  TestValidator.equals(
    "trash pagination records",
    output.pagination.records,
    0,
  );
  TestValidator.equals("trash pagination pages", output.pagination.pages, 0);
  TestValidator.equals("trash list empty", output.data.length, 0);
}
