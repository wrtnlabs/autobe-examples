import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate new todo creation by an authenticated user.
 *
 * - Register and authenticate as a new user (validate token/session issued).
 * - As that user, successfully create a new todo with unique title (edge
 *   values/success case).
 * - System assigns ownership (todo belongs to session user), sets timestamps,
 *   status is 'pending', completed_at and deleted_at are null/undefined.
 * - Attempt to create another todo with identical title for same user (should
 *   fail: title uniqueness enforced).
 * - Validate error cases: invalid title (too short/long/empty/whitespace),
 *   description too long, unauthenticated attempts.
 */
export async function test_api_todo_creation_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "X1",
    display_name: RandomGenerator.name(2),
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ITodoListUser.IJoin;
  const auth: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(auth);

  // 2. Create a valid todo
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 8,
  })
    .trim()
    .substring(0, 100);
  const todoDescription = RandomGenerator.paragraph({
    sentences: 7,
    wordMin: 3,
    wordMax: 10,
  });
  const createBody = {
    title: todoTitle,
    description: todoDescription,
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(todo);
  // Ownership attribution (id not provided by client, should not be overridable)
  TestValidator.predicate(
    "todo id is uuid",
    typeof todo.id === "string" && todo.id.length === 36,
  );
  TestValidator.equals(
    "todo title matches input",
    todo.title,
    todoTitle.trim(),
  );
  TestValidator.equals(
    "todo description matches input",
    todo.description,
    todoDescription,
  );
  TestValidator.equals("todo status is pending", todo.status, "pending");
  TestValidator.predicate(
    "todo created_at is ISO date",
    typeof todo.created_at === "string" && !isNaN(Date.parse(todo.created_at)),
  );
  TestValidator.predicate(
    "todo updated_at is ISO date",
    typeof todo.updated_at === "string" && !isNaN(Date.parse(todo.updated_at)),
  );
  TestValidator.equals(
    "todo completed_at is null/undefined",
    todo.completed_at,
    null,
  );
  TestValidator.equals(
    "todo deleted_at is null/undefined",
    todo.deleted_at,
    null,
  );

  // 3. Attempt to create todo with duplicate title for same user (should fail)
  await TestValidator.error("duplicate todo title should fail", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
      } satisfies ITodoListTodo.ICreate,
    });
  });

  // 4. Field validation cases
  // (a) Title too short (empty string after trimming)
  await TestValidator.error("empty/whitespace title should fail", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "   ",
      } satisfies ITodoListTodo.ICreate,
    });
  });
  // (b) Title too long
  const overlongTitle = ArrayUtil.repeat(101, () => "a").join("");
  await TestValidator.error("title > 100 chars should fail", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: overlongTitle,
      } satisfies ITodoListTodo.ICreate,
    });
  });

  // (c) Description too long (1001 chars)
  const invalidDescription = ArrayUtil.repeat(1001, () => "x").join("");
  await TestValidator.error(
    "description > 1000 chars should fail",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: RandomGenerator.paragraph({ sentences: 5 }),
          description: invalidDescription,
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );

  // 5. Attempt todo creation unauthenticated (fresh connection w/o auth)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot create todo",
    async () => {
      await api.functional.todoList.user.todos.create(unauthConn, {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: "desc",
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );
}
