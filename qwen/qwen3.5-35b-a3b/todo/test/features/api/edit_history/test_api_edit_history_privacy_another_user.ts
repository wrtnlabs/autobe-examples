import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import type { IMultiUserTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodoEditHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAppTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_app_member_todos_create } from "../../../generate/generate_random_multi_user_todo_app_member_todos_create";
import { prepare_random_multi_user_todo_app_todo } from "../../../prepare/prepare_random_multi_user_todo_app_todo";

export async function test_api_edit_history_privacy_another_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberA);
  // 2. Create a todo using member A's authenticated session
  const todo = await api.functional.multiUserTodoApp.member.todos.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        startDate: new Date(Date.now() + 86400000).toISOString(),
        dueDate: new Date(Date.now() + 172800000).toISOString(),
      } satisfies IMultiUserTodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Update the todo using member A's session to generate edit history entries
  const updatedTodo = await api.functional.multiUserTodoApp.member.todos.update(
    memberAConnection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IMultiUserTodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Register member B and obtain separate authentication credentials
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberB);
  // 5 & 6. Try to access member A's todo history as member B - should get 404
  await TestValidator.error(
    "member B cannot access member A's todo history",
    async () => {
      await api.functional.multiUserTodoApp.member.todos.history.at(
        memberBConnection,
        {
          todoId: todo.id,
        },
      );
    },
  );
  // 7. Verify member B can see their own todos but not member A's
  const memberBTodo = await api.functional.multiUserTodoApp.member.todos.create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IMultiUserTodoAppTodo.ICreate,
    },
  );
  typia.assert(memberBTodo);
  // Member B can access their own todo history
  const memberBHistory =
    await api.functional.multiUserTodoApp.member.todos.history.at(
      memberBConnection,
      {
        todoId: memberBTodo.id,
      },
    );
  typia.assert(memberBHistory);
  TestValidator.equals(
    "member B can access their own todo history",
    memberBHistory.data.length,
    1,
  );
}