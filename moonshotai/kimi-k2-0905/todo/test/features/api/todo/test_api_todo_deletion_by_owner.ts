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

export async function test_api_todo_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a member for deletion testing
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // Step 2: Create a test todo to delete
  const todoTitle = RandomGenerator.paragraph({ sentences: 1 });
  const createdTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
        priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(createdTodo);

  // Step 3: Delete the todo using the delete operation
  await api.functional.todo.member.todos.erase(connection, {
    todoId: createdTodo.id,
  });

  // Note: Since there is no retrieval endpoint available, we can only verify
  // that the delete operation completes successfully (returns void).
  // In a real system, the backend would handle proper cleanup and return
  // appropriate error responses if the todo didn't exist or wasn't owned.

  // Additional validation: Could attempt to delete the same todo again to test
  // error handling, but the scenario specifically focuses on successful deletion.

  // The test validates that a member can successfully delete their own todo
  // item and that the deletion operation completes without errors.
}
