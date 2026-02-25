import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_multi_user_todo_user_todos_create } from "../../../generate/generate_random_multi_user_todo_user_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the successful update of a todo item by its owner.
  // 1. User joins and authenticate
  // 2. User creates a todo item
  // 3. User updates the todo item with new valid fields
  // 4. Validate updated fields and ownership
  // 1. User join and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    displayName: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://referrer.example.com",
    ip: null,
  };
  const authorized = await authorize_user_join(userConnection, {
    body: joinBody,
  });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a todo item
  const todoBeforeUpdate =
    await generate_random_multi_user_todo_user_todos_create(userConnection, {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      },
    });
  typia.assert(todoBeforeUpdate);
  // 3. Update the todo item with new valid fields
  const updateBody: IMultiUserTodoTodo.IUpdate = {
    title: RandomGenerator.name(), // non-empty
    description: RandomGenerator.paragraph({ sentences: 5 }),
    startDate: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
  };
  const todoAfterUpdate = await api.functional.multiUserTodo.user.todos.update(
    userConnection,
    {
      todoId: todoBeforeUpdate.id,
      body: updateBody,
    },
  );
  typia.assert(todoAfterUpdate);
  // 4. Validate updated fields and ownership
  TestValidator.equals(
    "todo ID should remain unchanged",
    todoAfterUpdate.id,
    todoBeforeUpdate.id,
  );
  TestValidator.equals(
    "ownership ID should remain unchanged",
    todoAfterUpdate.user.id,
    todoBeforeUpdate.user.id,
  );
  TestValidator.equals(
    "title should be updated",
    todoAfterUpdate.title,
    updateBody.title,
  );
  TestValidator.equals(
    "description should be updated",
    todoAfterUpdate.description,
    updateBody.description ?? null,
  );
  TestValidator.equals(
    "startDate should be updated",
    todoAfterUpdate.startDate,
    updateBody.startDate ?? null,
  );
  TestValidator.equals(
    "dueDate should be updated",
    todoAfterUpdate.dueDate,
    updateBody.dueDate ?? null,
  );
}
