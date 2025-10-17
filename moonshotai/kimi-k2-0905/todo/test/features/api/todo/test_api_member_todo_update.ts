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

export async function test_api_member_todo_update(connection: api.IConnection) {
  // Step 1: Register a new member for authentication
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "!Aa1",
  } satisfies IMemberCreate.IRequest;

  const member: ITodoMember.IAuthorized = await api.functional.auth.member.join(
    connection,
    { body: memberData },
  );
  typia.assert(member);

  // Step 2: Create initial todo with basic properties
  const createData = {
    title: RandomGenerator.name() + " Task",
    priority: "Medium" as IETodoPriority,
  } satisfies ITodoTodo.ITodoCreate;

  const initialTodo: ITodoTodo = await api.functional.todo.member.todos.create(
    connection,
    { body: createData },
  );
  typia.assert(initialTodo);

  TestValidator.equals(
    "initial todo title matches",
    initialTodo.title,
    createData.title,
  );
  TestValidator.equals(
    "initial todo priority matches",
    initialTodo.priority,
    createData.priority,
  );
  TestValidator.equals(
    "initial todo is not completed",
    initialTodo.completed,
    false,
  );
  TestValidator.predicate(
    "initial todo has no completion timestamp",
    initialTodo.completed_at === null,
  );

  // Step 3: Update todo title
  const newTitle = "Updated " + RandomGenerator.name() + " Task";
  const titleUpdateResponse: ITodoTodo =
    await api.functional.todo.member.todos.update(connection, {
      todoId: initialTodo.id,
      body: { title: newTitle } satisfies ITodoTodo.ITodoUpdate,
    });
  typia.assert(titleUpdateResponse);

  TestValidator.equals(
    "title update response has new title",
    titleUpdateResponse.title,
    newTitle,
  );
  TestValidator.equals(
    "other properties unchanged after title update",
    titleUpdateResponse.id,
    initialTodo.id,
  );

  // Step 4: Update todo completion status
  const completionUpdateResponse: ITodoTodo =
    await api.functional.todo.member.todos.update(connection, {
      todoId: initialTodo.id,
      body: { completed: true } satisfies ITodoTodo.ITodoUpdate,
    });
  typia.assert(completionUpdateResponse);

  TestValidator.equals(
    "completion update sets completed to true",
    completionUpdateResponse.completed,
    true,
  );
  TestValidator.predicate(
    "completion update sets timestamp",
    completionUpdateResponse.completed_at !== null,
  );

  // Step 5: Update todo priority
  const priorities: IETodoPriority[] = ["Low", "Medium", "High"];
  const newPriority = RandomGenerator.pick(
    priorities.filter((p) => p !== completionUpdateResponse.priority),
  );

  const priorityUpdateResponse: ITodoTodo =
    await api.functional.todo.member.todos.update(connection, {
      todoId: initialTodo.id,
      body: { priority: newPriority } satisfies ITodoTodo.ITodoUpdate,
    });
  typia.assert(priorityUpdateResponse);
  TestValidator.equals(
    "priority update sets new priority",
    priorityUpdateResponse.priority,
    newPriority,
  );

  // Step 6: Attempt to update non-existent todo
  const fakeTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "updating non-existent todo should fail",
    async () => {
      await api.functional.todo.member.todos.update(connection, {
        todoId: fakeTodoId,
        body: { title: "Non-existent" } satisfies ITodoTodo.ITodoUpdate,
      });
    },
  );

  // Step 7: Multiple property updates
  const multiUpdateData = {
    title: "Final Updated " + RandomGenerator.name() + " Task",
    completed: false,
    priority: "High" as IETodoPriority,
  } satisfies ITodoTodo.ITodoUpdate;

  const multiUpdateResponse: ITodoTodo =
    await api.functional.todo.member.todos.update(connection, {
      todoId: initialTodo.id,
      body: multiUpdateData,
    });
  typia.assert(multiUpdateResponse);

  TestValidator.equals(
    "multi-update title matches",
    multiUpdateResponse.title,
    multiUpdateData.title,
  );
  TestValidator.equals(
    "multi-update completion matches",
    multiUpdateResponse.completed,
    multiUpdateData.completed,
  );
  TestValidator.equals(
    "multi-update priority matches",
    multiUpdateResponse.priority,
    multiUpdateData.priority,
  );
  TestValidator.predicate(
    "multi-update completion timestamp is cleared",
    multiUpdateResponse.completed_at === null,
  );

  // Verify final state is consistent
  TestValidator.equals(
    "final todo has correct member_id",
    multiUpdateResponse.member_id,
    member.id,
  );
  TestValidator.equals(
    "final todo id remains consistent",
    multiUpdateResponse.id,
    initialTodo.id,
  );
  TestValidator.predicate(
    "creation timestamp is preserved",
    multiUpdateResponse.created_at === initialTodo.created_at,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(multiUpdateResponse.updated_at) > new Date(initialTodo.created_at),
  );
}
