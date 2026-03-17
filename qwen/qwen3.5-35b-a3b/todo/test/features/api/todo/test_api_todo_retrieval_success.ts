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

export async function test_api_todo_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: IMultiUserTodoAppMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(memberData);
  // 2. Create todo with authenticated connection
  const todoConnection: api.IConnection = { host: connection.host };
  todoConnection.headers = {
    ...todoConnection.headers,
    Authorization: memberData.token.access,
  };
  const todoTitle: string = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription: string | null = typia.random<string>() ?? null;
  const todoStartDate: (string & tags.Format<"date-time">) | null =
    typia.random<string & tags.Format<"date-time">>() ?? null;
  const todoDueDate: (string & tags.Format<"date-time">) | null =
    typia.random<string & tags.Format<"date-time">>() ?? null;
  // Create todo first
  const createdTodo: IMultiUserTodoAppTodo =
    await api.functional.multiUserTodoApp.member.todos.create(todoConnection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        startDate: todoStartDate,
        dueDate: todoDueDate,
      } satisfies IMultiUserTodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);
  // Then retrieve todo by ID
  const retrievedTodo: IMultiUserTodoAppTodo =
    await api.functional.multiUserTodoApp.member.todos.at(todoConnection, {
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);
  // 3. Validate retrieved todo matches created todo
  TestValidator.equals("todo id", retrievedTodo.id, createdTodo.id);
  TestValidator.equals("todo title", retrievedTodo.title, createdTodo.title);
  TestValidator.equals(
    "todo description",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "todo startDate",
    retrievedTodo.startDate,
    createdTodo.startDate,
  );
  TestValidator.equals(
    "todo dueDate",
    retrievedTodo.dueDate,
    createdTodo.dueDate,
  );
  TestValidator.equals(
    "todo isCompleted",
    retrievedTodo.isCompleted,
    createdTodo.isCompleted,
  );
  TestValidator.equals(
    "todo createdAt",
    retrievedTodo.createdAt,
    createdTodo.createdAt,
  );
  TestValidator.equals(
    "todo updatedAt",
    retrievedTodo.updatedAt,
    createdTodo.updatedAt,
  );
  TestValidator.equals(
    "todo deletedAt",
    retrievedTodo.deletedAt,
    createdTodo.deletedAt,
  );
  TestValidator.equals(
    "todo user id",
    retrievedTodo.user.id,
    createdTodo.user.id,
  );
  TestValidator.equals(
    "todo user email",
    retrievedTodo.user.email,
    createdTodo.user.email,
  );
  TestValidator.equals(
    "todo user createdAt",
    retrievedTodo.user.createdAt,
    createdTodo.user.createdAt,
  );
}
