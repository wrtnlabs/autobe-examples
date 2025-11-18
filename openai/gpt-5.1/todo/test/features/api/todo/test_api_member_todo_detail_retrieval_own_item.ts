import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_member_todo_detail_retrieval_own_item(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) to obtain an authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // 2. Create a todo for this member user with deterministic content
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert<ITodoAppTodo>(createdTodo);

  // Basic invariants on created todo
  TestValidator.equals(
    "created todo title matches request body",
    createdTodo.title,
    todoCreateBody.title,
  );
  TestValidator.equals(
    "created todo description matches request body",
    createdTodo.description ?? null,
    todoCreateBody.description ?? null,
  );

  // The memberUser in the todo should correspond to the authorized member user
  TestValidator.equals(
    "todo memberUser.id matches authorized member id",
    createdTodo.memberUser.id,
    authorized.id,
  );
  TestValidator.equals(
    "todo memberUser.email matches authorized member email",
    createdTodo.memberUser.email,
    authorized.email,
  );

  // 3. Retrieve the same todo by id via GET /todoApp/memberUser/todos/{todoId}
  const fetchedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert<ITodoAppTodo>(fetchedTodo);

  // 4. Validate that fetched todo details match the created todo
  TestValidator.equals(
    "fetched todo id matches created todo id",
    fetchedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "fetched todo title matches created title",
    fetchedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "fetched todo description matches created description",
    fetchedTodo.description ?? null,
    createdTodo.description ?? null,
  );
  TestValidator.equals(
    "fetched todo status matches created status",
    fetchedTodo.status,
    createdTodo.status,
  );
  TestValidator.equals(
    "fetched todo created_at matches created created_at",
    fetchedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "fetched todo updated_at matches created updated_at",
    fetchedTodo.updated_at,
    createdTodo.updated_at,
  );
  TestValidator.equals(
    "fetched todo completed_at matches created completed_at",
    fetchedTodo.completed_at ?? null,
    createdTodo.completed_at ?? null,
  );
  TestValidator.equals(
    "fetched todo deleted_at matches created deleted_at",
    fetchedTodo.deleted_at ?? null,
    createdTodo.deleted_at ?? null,
  );

  // 5. Validate that memberUser summary in fetched todo matches authorized user
  TestValidator.equals(
    "fetched todo memberUser.id matches authorized id",
    fetchedTodo.memberUser.id,
    authorized.id,
  );
  TestValidator.equals(
    "fetched todo memberUser.email matches authorized email",
    fetchedTodo.memberUser.email,
    authorized.email,
  );

  // 6. Basic temporal invariant: created_at should be <= updated_at
  await TestValidator.predicate(
    "todo updated_at is not earlier than created_at",
    async () =>
      new Date(fetchedTodo.updated_at).getTime() >=
      new Date(fetchedTodo.created_at).getTime(),
  );
}
