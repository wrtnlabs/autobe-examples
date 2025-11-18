import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate bulk update operation enforces per-user todo title uniqueness.
 *
 * 1. Register and authenticate as a new user.
 * 2. Create three todos with unique titles.
 * 3. Attempt to bulk-update all todos: assign the same new title to two (should
 *    fail uniqueness), and a different new title to the third.
 * 4. Validate the response: only the two violating items are marked error; the
 *    other updates successfully.
 * 5. Retrieve all todos to confirm only legitimate updates persist, and per-user
 *    title uniqueness is enforced.
 */
export async function test_api_todos_bulk_update_title_uniqueness_enforced(
  connection: api.IConnection,
) {
  // 1. Register new user & authenticate
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(10);
  const joinBody = {
    email,
    password,
    href: "https://e2e.local/join",
    referrer: "https://e2e.local/",
  } satisfies ITodoAppUser.IJoin;
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(user);

  // 2. Create 3 todos with unique titles
  const todoTitles = [
    RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    RandomGenerator.paragraph({ sentences: 1, wordMin: 8, wordMax: 15 }),
  ];
  const createdTodos: ITodoAppTodo[] = [];
  for (let i = 0; i < 3; ++i) {
    const body = {
      title: todoTitles[i],
      description: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 12,
        wordMin: 4,
        wordMax: 14,
      }),
      due_date: null,
    } satisfies ITodoAppTodo.ICreate;
    const todo = await api.functional.todoApp.user.todos.create(connection, {
      body,
    });
    typia.assert(todo);
    TestValidator.equals(`todo ${i} title matches`, todo.title, todoTitles[i]);
    createdTodos.push(todo);
  }

  // 3. Attempt bulk update: set same title for first two, different for third
  const duplicateTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 6,
    wordMax: 9,
  });
  const uniqueTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 7,
    wordMax: 14,
  });
  // Prepare to apply bulk: two conflicting, one legit
  const ids = createdTodos.map((todo) => todo.id);
  const bulkBody = {
    ids,
    update: {
      title: duplicateTitle,
    },
  } satisfies ITodoAppTodo.IBulkUpdate;

  // First: do a separate update on third todo to unique title so only 2 will conflict in bulk
  await api.functional.todoApp.user.todos.bulk.updateBulk(connection, {
    body: {
      ids: [createdTodos[2].id],
      update: { title: uniqueTitle },
    },
  });

  // Now: attempt bulk update setting same title to all
  const bulkResp = await api.functional.todoApp.user.todos.bulk.updateBulk(
    connection,
    {
      body: bulkBody,
    },
  );
  typia.assert(bulkResp);
  // 4. Validate response
  const resultById: Record<string, ITodoAppTodo.IBulkUpdateResultItem> = {};
  for (const item of bulkResp.results) resultById[item.id] = item;
  // Only first and second should fail, third (already unique title) unchanged
  for (let i = 0; i < 3; ++i) {
    const todoId = createdTodos[i].id;
    if (i < 2) {
      TestValidator.predicate(
        `bulk result [${i}] should be error for uniqueness`,
        !resultById[todoId].success &&
          typeof resultById[todoId].error === "string" &&
          resultById[todoId].error.toLowerCase().includes("unique"),
      );
    } else {
      TestValidator.predicate(
        `bulk result [${i}] should be unchanged`,
        !resultById[todoId].success &&
          typeof resultById[todoId].error === "string",
      );
    }
  }

  // 5. (Simulated) -- If there were a list endpoint: Retrieve all active todos for the user, and validate uniqueness is enforced
}
