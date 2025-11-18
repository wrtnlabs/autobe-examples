import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate updating all mutable fields (title, description, due date, status)
 * of an existing todo item owned by the authenticated user. Confirm uniqueness
 * constraint of title, correct updating of audit fields for completed and
 * deleted status, and reflect all changes in the returned todo. Ownership is
 * strictly enforced: only the owner can update their todo. Creation step
 * precedes update for a valid target. Steps:
 *
 * 1. Register a new user (owner) and authenticate, storing credentials and tokens.
 * 2. Create a new todo as this owner (with unique title/description/due date).
 * 3. Update title to a different unique value, checking the returned todo.
 * 4. Try updating title to the same value as another active todo: expect error.
 * 5. Update description and due date—validate changes in returned object.
 * 6. Transition status to 'completed', confirm completed_at is set and audit
 *    update.
 * 7. Transition status to 'deleted', confirm deleted_at is set and audit update.
 * 8. Register a second user and authenticate (anotherUser).
 * 9. Attempt to update the first user's todo as another user—must fail (ownership
 *    enforced).
 */
export async function test_api_todo_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register owner user
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(12);
  const owner: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: ownerEmail,
        password: ownerPassword as string &
          tags.MinLength<8> &
          tags.MaxLength<72> &
          tags.Format<"password">,
        href: "https://todo-app.test/register",
        referrer: "https://todo-app.test/landing",
        ip: null,
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(owner);

  // 2. Create todo for owner
  const todoTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });
  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
        description: RandomGenerator.paragraph({ sentences: 8 }),
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals("todo title matches input", todo.title, todoTitle);

  // 3. Update title to a new unique value
  const newTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });
  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: todo.id,
      body: {
        title: newTitle,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);
  TestValidator.equals("updated title applied", updatedTodo.title, newTitle);
  TestValidator.notEquals(
    "updated_at changes after update",
    updatedTodo.updated_at,
    todo.updated_at,
  );

  // 4. Try to create another todo with a new unique title
  const anotherTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });
  const anotherTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: { title: anotherTitle },
    });
  typia.assert(anotherTodo);

  // 5. Try to update existing active todo title to another existing active title (should fail uniqueness)
  await TestValidator.error(
    "cannot update title to one already in use",
    async () => {
      await api.functional.todoApp.user.todos.update(connection, {
        todoId: anotherTodo.id,
        body: {
          title: newTitle, // previously used by another todo
        },
      });
    },
  );

  // 6. Update description and due date (clear due_date to null, set new desc)
  const newDesc = RandomGenerator.paragraph({ sentences: 10 });
  const updatedFields: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: updatedTodo.id,
      body: {
        description: newDesc,
        due_date: null,
      },
    });
  typia.assert(updatedFields);
  TestValidator.equals(
    "updated description applied",
    updatedFields.description,
    newDesc,
  );
  TestValidator.equals("due_date cleared", updatedFields.due_date, null);

  // 7. Update status to completed (should set completed_at and updated_at)
  const completed: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: updatedFields.id,
      body: {
        status: "completed",
      },
    });
  typia.assert(completed);
  TestValidator.equals(
    "status set to completed",
    completed.status,
    "completed",
  );
  TestValidator.predicate(
    "completed_at is set after update to completed",
    completed.completed_at !== null && completed.completed_at !== undefined,
  );
  TestValidator.notEquals(
    "updated_at changed on completion",
    completed.updated_at,
    updatedFields.updated_at,
  );

  // 8. Update status to deleted (should set deleted_at and updated_at)
  const deleted: ITodoAppTodo = await api.functional.todoApp.user.todos.update(
    connection,
    {
      todoId: completed.id,
      body: { status: "deleted" },
    },
  );
  typia.assert(deleted);
  TestValidator.equals("status set to deleted", deleted.status, "deleted");
  TestValidator.predicate(
    "deleted_at is set after deletion",
    deleted.deleted_at !== null && deleted.deleted_at !== undefined,
  );
  TestValidator.notEquals(
    "updated_at changed on delete",
    deleted.updated_at,
    completed.updated_at,
  );

  // 9. Register another user
  const anotherUserEmail = typia.random<string & tags.Format<"email">>();
  const anotherUserPassword = RandomGenerator.alphaNumeric(12);
  const anotherUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: anotherUserEmail,
        password: anotherUserPassword as string &
          tags.MinLength<8> &
          tags.MaxLength<72> &
          tags.Format<"password">,
        href: "https://todo-app.test/register",
        referrer: "https://todo-app.test/landing",
        ip: null,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(anotherUser);

  // 10. Try unauthorized update as anotherUser: must fail
  await TestValidator.error(
    "owner enforcement: another user cannot update first user's todo",
    async () => {
      await api.functional.todoApp.user.todos.update(connection, {
        todoId: todo.id,
        body: {
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      });
    },
  );
}
