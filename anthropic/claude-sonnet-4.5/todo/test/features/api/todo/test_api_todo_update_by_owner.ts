import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating an existing Todo by its owner.
 *
 * 1. Register a new user to own the Todo
 * 2. Create a Todo under this user
 * 3. Update each mutable Todo field: a. Change title (new value <=100 chars,
 *    unique) b. Change or nullify description (<=500 chars/null) c. Set
 *    due_date to present/future ISO8601 datetime or null d. Switch status
 *    between 'pending'/'completed'/'deleted' e. Confirm
 *    system-managed/user/audit fields are not client-modifiable
 * 4. Confirm expected updates and that only allowed fields changed. User/audit
 *    fields are not client-modifiable.
 * 5. Attempt to update title to another Todo's title (should trigger duplicate
 *    check)
 * 6. Ensure only the Todo owner can update their task (secondary user cannot
 *    update)
 */
export async function test_api_todo_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://google.com/",
  } satisfies ITodoListUser.IJoin;
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(user);
  TestValidator.equals("joined user email", user.email, userEmail);

  // Step 2: Create a Todo under this user
  const todoCreateBody = {
    title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 10,
    }).substring(0, 50),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 10,
    }),
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    status: "pending",
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    { body: todoCreateBody },
  );
  typia.assert(todo);
  TestValidator.equals("owner matches", todo.user.id, user.id);
  TestValidator.equals("title matches", todo.title, todoCreateBody.title);
  TestValidator.equals("status is pending", todo.status, "pending");
  TestValidator.equals(
    "description set",
    todo.description,
    todoCreateBody.description,
  );
  TestValidator.equals("due_date set", todo.due_date, todoCreateBody.due_date);
  TestValidator.predicate(
    "created_at present",
    typeof todo.created_at === "string" && todo.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof todo.updated_at === "string" && todo.updated_at.length > 0,
  );

  // Step 3a: Update title
  const newTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  }).substring(0, 80);
  const updateTitleBody = { title: newTitle } satisfies ITodoListTodo.IUpdate;
  const updatedByTitle = await api.functional.todoList.user.todos.update(
    connection,
    { todoId: todo.id, body: updateTitleBody },
  );
  typia.assert(updatedByTitle);
  TestValidator.equals("title updated", updatedByTitle.title, newTitle);
  TestValidator.notEquals(
    "updated_at should refresh after title update",
    updatedByTitle.updated_at,
    todo.updated_at,
  );
  TestValidator.equals("owner stays the same", updatedByTitle.user.id, user.id);

  // Step 3b: Update description (to null)
  const updateDescNull = { description: null } satisfies ITodoListTodo.IUpdate;
  const updatedDescNull = await api.functional.todoList.user.todos.update(
    connection,
    { todoId: todo.id, body: updateDescNull },
  );
  typia.assert(updatedDescNull);
  TestValidator.equals(
    "description is null",
    updatedDescNull.description,
    null,
  );

  // Step 3c: Update due_date to null then present/future value
  const updateDueDateNull = { due_date: null } satisfies ITodoListTodo.IUpdate;
  const updatedDueNull = await api.functional.todoList.user.todos.update(
    connection,
    { todoId: todo.id, body: updateDueDateNull },
  );
  typia.assert(updatedDueNull);
  TestValidator.equals("due_date is null", updatedDueNull.due_date, null);
  // Set to a date 2 hours in the future
  const nextDueDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const updateDueNew = {
    due_date: nextDueDate,
  } satisfies ITodoListTodo.IUpdate;
  const updatedDueVal = await api.functional.todoList.user.todos.update(
    connection,
    { todoId: todo.id, body: updateDueNew },
  );
  typia.assert(updatedDueVal);
  TestValidator.equals("due_date updated", updatedDueVal.due_date, nextDueDate);

  // Step 3d: Update status between allowed values
  const statuses = ["pending", "completed", "deleted"] as const;
  for (const status of statuses) {
    const statBody = { status } satisfies ITodoListTodo.IUpdate;
    const updatedStat = await api.functional.todoList.user.todos.update(
      connection,
      { todoId: todo.id, body: statBody },
    );
    typia.assert(updatedStat);
    TestValidator.equals(
      `status updated to ${status}`,
      updatedStat.status,
      status,
    );
    TestValidator.equals("todo id remains unchanged", updatedStat.id, todo.id);
  }

  // Confirm audit/user/system fields are not client-modifiable (by design: DTO does not allow them in body)
  const verifyNoAuditFieldUpdateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }).substring(0, 40),
  } satisfies ITodoListTodo.IUpdate;
  const verifyNoAuditFieldUpdate =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo.id,
      body: verifyNoAuditFieldUpdateBody,
    });
  typia.assert(verifyNoAuditFieldUpdate);
  // Confirm user fields remain under system management
  TestValidator.equals(
    "user is unchanged",
    verifyNoAuditFieldUpdate.user.id,
    user.id,
  );
  TestValidator.equals(
    "todo id still same",
    verifyNoAuditFieldUpdate.id,
    todo.id,
  );

  // Step 5: Test duplicate title update (make a second todo with another title, try to update first todo title to duplicate)
  const secondTodoBody = {
    title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 10,
    }).substring(0, 80),
    status: "pending",
  } satisfies ITodoListTodo.ICreate;
  const secondTodo = await api.functional.todoList.user.todos.create(
    connection,
    { body: secondTodoBody },
  );
  typia.assert(secondTodo);
  await TestValidator.error(
    "duplicate title update triggers error",
    async () => {
      await api.functional.todoList.user.todos.update(connection, {
        todoId: todo.id,
        body: { title: secondTodo.title },
      });
    },
  );

  // Step 6: Ensure only the owner can update the Todo (register new user and try update)
  const attackerEmail = typia.random<string & tags.Format<"email">>();
  const attackerJoin = {
    email: attackerEmail,
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://attacker.com/join",
    referrer: "https://phishing.com/",
  } satisfies ITodoListUser.IJoin;
  const attackerUser = await api.functional.auth.user.join(connection, {
    body: attackerJoin,
  });
  typia.assert(attackerUser);
  await TestValidator.error("non-owner update forbidden", async () => {
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }).substring(0, 80),
      },
    });
  });
}
