import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";

/**
 * Validate that a todoMember can retrieve their own Todo by id.
 *
 * Business context:
 *
 * - A member joins (registration issues JWTs and SDK sets Authorization).
 * - The member creates a Todo with a valid single-line title.
 * - The member retrieves the Todo via the owner-scoped detail endpoint using the
 *   id.
 *
 * What this test validates:
 *
 * 1. Happy-path retrieval returns the correct entity and fields.
 * 2. Field invariants:
 *
 *    - IsCompleted is false by default on creation
 *    - CreatedAt remains unchanged between create and fetch
 *    - UpdatedAt is greater than or equal to createdAt (both on create and fetch)
 * 3. Negative scenario: non-existent todoId results in an error (no status code
 *    assertion).
 *
 * Notes:
 *
 * - No assumptions on global state or list ordering.
 * - No manual header manipulation; SDK handles Authorization.
 */
export async function test_api_todo_detail_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1) Register a new member (join) to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListTodoMemberJoin.ICreate;
  const member = await api.functional.auth.todoMember.join(connection, {
    body: joinBody,
  });
  typia.assert<ITodoListTodoMember.IAuthorized>(member);

  // 2) Create a Todo with a valid single-line title
  const newTitle: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });
  const createBody = {
    title: newTitle,
  } satisfies ITodoListTodo.ICreate;
  const created = await api.functional.todoList.todos.create(connection, {
    body: createBody,
  });
  typia.assert<ITodoListTodo>(created);

  // Invariants on creation
  TestValidator.equals(
    "isCompleted defaults to false on create",
    created.isCompleted,
    false,
  );

  // 3) Retrieve via owner-scoped endpoint
  const fetched = await api.functional.todoList.todoMember.todos.at(
    connection,
    {
      todoId: created.id,
    },
  );
  typia.assert<ITodoListTodo>(fetched);

  // 4) Business validations
  TestValidator.equals(
    "fetched todo id matches created id",
    fetched.id,
    created.id,
  );
  TestValidator.equals(
    "fetched title equals creation input",
    fetched.title,
    createBody.title,
  );
  TestValidator.equals(
    "fetched isCompleted equals created isCompleted (expected false)",
    fetched.isCompleted,
    created.isCompleted,
  );

  // 5) Timestamp invariants (format assured by typia; check temporal ordering)
  const createdAtMs: number = Date.parse(created.createdAt);
  const createdUpdatedAtMs: number = Date.parse(created.updatedAt);
  const fetchedCreatedAtMs: number = Date.parse(fetched.createdAt);
  const fetchedUpdatedAtMs: number = Date.parse(fetched.updatedAt);

  TestValidator.predicate(
    "created.updatedAt is >= created.createdAt",
    createdUpdatedAtMs >= createdAtMs,
  );
  TestValidator.predicate(
    "fetched.updatedAt is >= fetched.createdAt",
    fetchedUpdatedAtMs >= fetchedCreatedAtMs,
  );
  TestValidator.equals(
    "fetched.createdAt equals created.createdAt",
    fetched.createdAt,
    created.createdAt,
  );

  // 6) Negative case: non-existent id should error
  const nonExistingId = typia.random<string & tags.Format<"uuid">>();
  if (nonExistingId === created.id) {
    const anotherId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.error(
      "retrieving todo with non-existent id should fail",
      async () => {
        await api.functional.todoList.todoMember.todos.at(connection, {
          todoId: anotherId,
        });
      },
    );
  } else {
    await TestValidator.error(
      "retrieving todo with non-existent id should fail",
      async () => {
        await api.functional.todoList.todoMember.todos.at(connection, {
          todoId: nonExistingId,
        });
      },
    );
  }
}
