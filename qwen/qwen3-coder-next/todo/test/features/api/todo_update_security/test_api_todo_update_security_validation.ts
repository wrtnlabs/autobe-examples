import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrincipal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrincipal";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_update_security_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register user A and create todo item
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(userA);
  const todoA = await generate_random_todo_app_user_todos_create(
    userAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(todoA);
  // 2. Register user B (separate account)
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(userB);
  // 3. User B attempts to update user A's todo (should fail with 404 for security)
  await TestValidator.error(
    "user B cannot update user A's todo (security)",
    async () => {
      await api.functional.todoApp.user.todos.update(userBConnection, {
        todoId: todoA.id,
        body: {
          title: "Hacked title",
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
  // 4. Verify that update attempt does not reveal existence of todo to unauthorized user
  // (The 404 response ensures we don't leak existence information)
  // 5. Test validation with invalid date formats
  await TestValidator.error("invalid start_date format", async () => {
    await api.functional.todoApp.user.todos.update(userAConnection, {
      todoId: todoA.id,
      body: {
        startDate: "not-a-date" as any,
      } satisfies ITodoAppTodo.IUpdate,
    });
  });
  await TestValidator.error("invalid due_date format", async () => {
    await api.functional.todoApp.user.todos.update(userAConnection, {
      todoId: todoA.id,
      body: {
        dueDate: "invalid-date" as any,
      } satisfies ITodoAppTodo.IUpdate,
    });
  });
  // 6. Test validation with empty title or whitespace-only title
  await TestValidator.error("empty title validation", async () => {
    await api.functional.todoApp.user.todos.update(userAConnection, {
      todoId: todoA.id,
      body: {
        title: "" as any,
      } satisfies ITodoAppTodo.IUpdate,
    });
  });
  await TestValidator.error("whitespace-only title validation", async () => {
    await api.functional.todoApp.user.todos.update(userAConnection, {
      todoId: todoA.id,
      body: {
        title: "   " as any,
      } satisfies ITodoAppTodo.IUpdate,
    });
  });
  // 7. Verify successful update with valid data after security and validation tests
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    userAConnection,
    {
      todoId: todoA.id,
      body: {
        title: "Updated title",
        description: "Updated description",
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  TestValidator.equals(
    "title updated correctly",
    updatedTodo.title,
    "Updated title",
  );
  TestValidator.equals(
    "description updated correctly",
    updatedTodo.description,
    "Updated description",
  );
}
