import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
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

export async function test_api_todo_update_edit_history_created(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // Create authenticated connection for todo operations
  const todoConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${member.token.access}`,
    },
  };
  // 2. Create initial todo with first member
  const initialTodo =
    await generate_random_multi_user_todo_app_member_todos_create(
      todoConnection,
      {
        body: {
          title: "Initial Title",
          description: "Initial description",
          startDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        },
      },
    );
  typia.assert(initialTodo);
  // Store initial updated_at timestamp
  const initialUpdatedAt = initialTodo.updatedAt;
  // 3. Update todo title
  const updatedTodo = await api.functional.multiUserTodoApp.member.todos.update(
    todoConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: "Updated Title",
      },
    },
  );
  typia.assert(updatedTodo);
  // 4. Verify edit history was created (updated_at changed)
  TestValidator.notEquals(
    "updated_at changed",
    initialUpdatedAt,
    updatedTodo.updatedAt,
  );
  TestValidator.equals("title updated", updatedTodo.title, "Updated Title");
  // 5. Create second member to test ownership enforcement
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(secondMember);
  // Create authenticated connection for second member
  const secondMemberTodoConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${secondMember.token.access}`,
    },
  };
  // 6. Create second todo for second member
  const secondTodo =
    await generate_random_multi_user_todo_app_member_todos_create(
      secondMemberTodoConnection,
      {
        body: {
          title: "Second Member Todo",
          description: "Second member description",
        },
      },
    );
  typia.assert(secondTodo);
  // 7. Verify second member cannot update first member's todo
  await TestValidator.error("cannot update other user's todo", async () => {
    await api.functional.multiUserTodoApp.member.todos.update(
      secondMemberTodoConnection,
      {
        todoId: initialTodo.id,
        body: { title: "Hacked Title" },
      },
    );
  });
}
