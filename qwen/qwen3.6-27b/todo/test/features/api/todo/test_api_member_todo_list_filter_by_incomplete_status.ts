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

export async function test_api_member_todo_list_filter_by_incomplete_status(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create 3 todos (default incomplete)
  const todos = await ArrayUtil.asyncRepeat<ITodoAppTodo>(3, async () => {
    return generate_random_todo_app_member_todos_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    });
  });
  // 3. Query with filter status='incomplete'
  const body = { status: "incomplete" } satisfies ITodoAppTodo.IRequest;
  const response = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body,
    },
  );
  typia.assert(response);
  // 4. Verify all created todos appear in the data array
  const createdIds = todos.map(({ id }) => id);
  const responseIds = response.data.map(({ id }) => id);
  // Check each todo was returned
  for (const createdId of createdIds) {
    TestValidator.predicate(
      "created todo found in response",
      responseIds.includes(createdId),
    );
  }
  // 5. Verify pagination record counts
  TestValidator.equals(
    "pagination records match created todo count",
    response.pagination.records,
    createdIds.length,
  );
}
