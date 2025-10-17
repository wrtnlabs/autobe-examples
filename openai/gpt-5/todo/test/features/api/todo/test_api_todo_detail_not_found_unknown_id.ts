import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";

/**
 * Validate not-found behavior for a non-existent Todo id within the caller’s
 * scope.
 *
 * Steps:
 *
 * 1. Join as a new todoMember (to establish authenticated context).
 * 2. Create a Todo and capture its id.
 * 3. Synthesize a different, well-formed UUID by altering one hexadecimal
 *    character while preserving the UUID format (avoid hyphens).
 * 4. Call GET /todoList/todoMember/todos/{alteredId} under the same session.
 * 5. Expect an error (privacy-preserving not-found). Do not assert status code.
 */
export async function test_api_todo_detail_not_found_unknown_id(
  connection: api.IConnection,
) {
  // 1) Join as a new todoMember
  const member = await api.functional.auth.todoMember.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies ITodoListTodoMemberJoin.ICreate,
  });
  typia.assert(member);

  // 2) Create a baseline Todo to get a real UUID sample
  const created = await api.functional.todoList.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(created);

  // 3) Synthesize a different, well-formed UUID by altering one hex character
  const originalId = created.id;
  // Find a non-hyphen index from the end for simplicity
  let index = originalId.length - 1;
  while (index >= 0 && originalId[index] === "-") index--;
  // Fallback to a safe earlier position if somehow at a hyphen
  if (index < 0) index = 0;

  const currentChar = originalId[index]!.toLowerCase();
  const hex = [..."0123456789abcdef"];
  const candidates = hex.filter((c) => c !== currentChar);
  const replacement = RandomGenerator.pick(candidates);

  const alteredRaw =
    originalId.substring(0, index) +
    replacement +
    originalId.substring(index + 1);

  // Ensure it remains a valid UUID format at type level and differs from original
  const altered = typia.assert<string & tags.Format<"uuid">>(alteredRaw);
  TestValidator.notEquals(
    "altered uuid must differ from original",
    altered,
    originalId,
  );

  // 4) GET with altered id → 5) Expect error (privacy-preserving not-found)
  await TestValidator.error(
    "get unknown todo by altered uuid should throw",
    async () => {
      await api.functional.todoList.todoMember.todos.at(connection, {
        todoId: altered,
      });
    },
  );
}
