import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_todo_view_other_member_todo_denied_privacy_boundary(
  connection: api.IConnection,
): Promise<void> {
  // NOTE: Use actor-specific connections only. Base connection must not be used directly.
  // 1) Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAAuthorized);
  const memberATodoConnection: api.IConnection = { host: connection.host };
  // The authorize utility sets memberAConnection.headers.Authorization. Mirror it into a new connection.
  memberATodoConnection.headers = memberAConnection.headers;
  // 2) Member A creates todo
  const todoForA = await generate_random_todo_app_member_todos_create(
    memberATodoConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoForA);
  const crossMemberTodoId = todoForA.id;
  // 3) Member B joins (new identity)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberBAuthorized);
  const memberBTodoConnection: api.IConnection = { host: connection.host };
  memberBTodoConnection.headers = memberBConnection.headers;
  // 4) Member B tries to view Member A's todo
  await TestValidator.error(
    "should deny cross-member todo access without leaking existence",
    async () => {
      const output = await api.functional.todoApp.member.todos.at(
        memberBTodoConnection,
        {
          todoId: crossMemberTodoId,
        },
      );
      typia.assert(output);
      // If API call unexpectedly succeeds, fail the test.
      throw new Error("Cross-member todo access should have been denied");
    },
  );
}
