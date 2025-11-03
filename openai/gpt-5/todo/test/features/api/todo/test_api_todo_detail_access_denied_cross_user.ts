import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_todo_detail_access_denied_cross_user(
  connection: api.IConnection,
) {
  /**
   * Validate ownership enforcement by attempting to retrieve another user’s
   * todo.
   *
   * Steps:
   *
   * 1. Create two independent connections to isolate auth contexts (connA, connB)
   * 2. Join as User A (connA)
   * 3. Join as User B (connB)
   * 4. Under User B (connB), create a todo and capture its id
   * 5. Using User A (connA), attempt GET with User B’s todoId → expect error
   * 6. Using User B (connB), GET the same todo → expect success and id equality
   */

  // 1) Two independent connections (SDK manages headers after auth)
  const connA: api.IConnection = { ...connection, headers: {} };
  const connB: api.IConnection = { ...connection, headers: {} };

  // 2) Join as User A
  const joinABody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `A1${RandomGenerator.alphaNumeric(10)}`,
    href: `https://${RandomGenerator.alphabets(8)}.example.com/${RandomGenerator.alphaNumeric(6)}`,
    referrer: "",
  } satisfies ITodoUser.IJoin;
  const authA = await api.functional.auth.user.join(connA, { body: joinABody });
  typia.assert(authA);

  // 3) Join as User B
  const joinBBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `B2${RandomGenerator.alphaNumeric(10)}`,
    href: `https://${RandomGenerator.alphabets(8)}.example.com/${RandomGenerator.alphaNumeric(6)}`,
    referrer: "",
  } satisfies ITodoUser.IJoin;
  const authB = await api.functional.auth.user.join(connB, { body: joinBBody });
  typia.assert(authB);

  // 4) User B creates a todo
  const createBBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
      wordMin: 3,
      wordMax: 8,
    }),
    due_date: typia.random<string & tags.Format<"date">>(),
  } satisfies ITodoTodo.ICreate;
  const createdB = await api.functional.todo.user.todos.create(connB, {
    body: createBBody,
  });
  typia.assert(createdB);
  // Owner mapping sanity check (created todo belongs to User B)
  TestValidator.equals(
    "created todo belongs to User B",
    createdB.user.id,
    authB.id,
  );

  // 5) Cross-user access must be denied (User A tries to read User B's todo)
  await TestValidator.error("cross-user access must be denied", async () => {
    await api.functional.todo.user.todos.at(connA, { todoId: createdB.id });
  });

  // 6) Owner can read the todo
  const readB = await api.functional.todo.user.todos.at(connB, {
    todoId: createdB.id,
  });
  typia.assert(readB);
  TestValidator.equals("owner can read: ids must match", readB.id, createdB.id);
}
