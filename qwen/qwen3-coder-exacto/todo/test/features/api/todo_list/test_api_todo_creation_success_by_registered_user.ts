import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * E2E: Successful creation of a todo by a newly registered user with business
 * and API-level validations.
 *
 * This test covers the workflow for a registered user creating their first todo
 * item.
 *
 * Step-by-step process:
 *
 * 1. Register a new user (obtain JWT; system requires tracking of session/audit
 *    info via href/referrer).
 * 2. Using the newly registered, authenticated user, create todo(s) via
 *    /todoList/user/todos.
 * 3. Check API accepts minimal required input for todo (title only produces
 *    success; completed always false).
 * 4. Provide maximal/optional inputs (boundary: title length 255, description
 *    length 1000, valid future due_date).
 * 5. Validate response correctness: All todo fields (id, title, description,
 *    due_date, completed=false, created/updated_at, owner) must be provided and
 *    type-accurate; owner always matches registered user.
 * 6. Edge cases: Attempt creation with empty title, title/description exceeding
 *    limits, or due_date in the past/far-past must be rejected at API level
 *    (error thrown, not accepted).
 * 7. Confirm default behaviors (completion status is always false) and
 *    unauthenticatable context is not allowed for todo creation.
 */
export async function test_api_todo_creation_success_by_registered_user(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = "1234Abcd!"; // Use a strong-ish password per policy
  const href = "https://app.example.com/register";
  const referrer = "https://app.example.com/landing";
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      href,
      referrer,
      // omit IP so that backend assigns detected
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userAuth);
  TestValidator.predicate(
    "User ID is uuid",
    typeof userAuth.id === "string" && userAuth.id.length > 0,
  );
  TestValidator.predicate("JWT access token exists", !!userAuth.token.access);

  // Step 2.1: Minimal todo (only title, all other fields omitted)
  const minimalTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 15,
  });
  const todoMinimal = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: minimalTitle,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todoMinimal);
  TestValidator.equals(
    "owner always matches authenticated user",
    todoMinimal.user.id,
    userAuth.id,
  );
  TestValidator.equals("title is correct", todoMinimal.title, minimalTitle);
  TestValidator.equals(
    "completed defaults to false",
    todoMinimal.completed,
    false,
  );
  TestValidator.predicate(
    "timestamps are iso8601",
    typeof todoMinimal.created_at === "string" &&
      typeof todoMinimal.updated_at === "string",
  );
  TestValidator.equals(
    "description absent is undefined",
    todoMinimal.description,
    undefined,
  );
  TestValidator.equals(
    "due_date absent is undefined",
    (todoMinimal as any).due_date,
    undefined,
  );
  TestValidator.predicate(
    "todo id is uuid",
    typeof todoMinimal.id === "string" && todoMinimal.id.length > 0,
  );

  // Step 2.2: Full todo (max boundary fields)
  const validDueDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 3,
  ).toISOString();
  const maxTitle = RandomGenerator.alphabets(255);
  const maxDescription = RandomGenerator.alphabets(1000);
  const todoFull = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: maxTitle,
      description: maxDescription,
      due_date: validDueDate satisfies string & tags.Format<"date-time">,
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todoFull);
  TestValidator.equals("owner matches user", todoFull.user.id, userAuth.id);
  TestValidator.equals("title matches input", todoFull.title, maxTitle);
  TestValidator.equals(
    "description matches input",
    todoFull.description,
    maxDescription,
  );
  TestValidator.equals(
    "due_date matches input",
    (todoFull as any).due_date,
    validDueDate,
  );
  TestValidator.equals("completed always false", todoFull.completed, false);
  TestValidator.notEquals(
    "created/updated_at must NOT be empty",
    todoFull.created_at,
    "",
  );

  // Step 3: Edge case - empty title (violates min length)
  await TestValidator.error("empty title throws validation error", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "",
      } satisfies ITodoListTodo.ICreate,
    });
  });

  // Step 4: Edge case - title too long (exceeds 255)
  await TestValidator.error("too long title rejected", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.alphabets(256),
      } satisfies ITodoListTodo.ICreate,
    });
  });

  // Step 5: Edge - too long description
  await TestValidator.error("too long description rejected", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Valid title",
        description: RandomGenerator.alphabets(1001),
      } satisfies ITodoListTodo.ICreate,
    });
  });

  // Step 6: Edge - due_date in the past
  await TestValidator.error("due_date in past is rejected", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Valid title",
        due_date: new Date(
          Date.now() - 1000 * 60 * 60 * 24,
        ).toISOString() as string & tags.Format<"date-time">,
      } satisfies ITodoListTodo.ICreate,
    });
  });

  // Step 7: Cannot create todo if unauthenticated (fresh connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated context is rejected for todo create",
    async () => {
      await api.functional.todoList.user.todos.create(unauthConn, {
        body: {
          title: "ShouldFail",
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );
}
