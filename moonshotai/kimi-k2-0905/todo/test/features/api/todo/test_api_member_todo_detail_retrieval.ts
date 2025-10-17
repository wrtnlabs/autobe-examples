import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoPriority";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";

export async function test_api_member_todo_detail_retrieval(
  connection: api.IConnection,
) {
  // Create a member account for authentication
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(memberAuth);
  TestValidator.equals("member role", memberAuth.role, "member");

  // Create a todo item with random data
  const todoCreate = {
    title: RandomGenerator.name(),
    priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
  } satisfies ITodoTodo.ITodoCreate;

  const createdTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: todoCreate,
    },
  );
  typia.assert(createdTodo);

  // Validate the created todo has all expected properties
  TestValidator.equals(
    "created todo title",
    createdTodo.title,
    todoCreate.title,
  );
  TestValidator.equals(
    "created todo priority",
    createdTodo.priority,
    todoCreate.priority,
  );
  TestValidator.equals("created todo completed", createdTodo.completed, false);

  // Retrieve the todo by ID
  const retrievedTodo = await api.functional.todo.member.todos.at(connection, {
    todoId: createdTodo.id,
  });
  typia.assert(retrievedTodo);

  // Validate the retrieved todo matches the original
  TestValidator.equals("retrieved todo id", retrievedTodo.id, createdTodo.id);
  TestValidator.equals(
    "retrieved todo title",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "retrieved todo completed",
    retrievedTodo.completed,
    createdTodo.completed,
  );
  TestValidator.equals(
    "retrieved todo priority",
    retrievedTodo.priority,
    createdTodo.priority,
  );
  TestValidator.equals(
    "retrieved todo member_id",
    retrievedTodo.member_id,
    memberAuth.id,
  );
  TestValidator.equals(
    "retrieved todo created_at",
    retrievedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "retrieved todo updated_at",
    retrievedTodo.updated_at,
    createdTodo.updated_at,
  );
}
