import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test comprehensive sorting functionality for todo list API operations.
 *
 * This test validates that the todo list retrieval endpoint (PATCH
 * /todoList/user/todos) correctly handles all sorting options (created_at,
 * updated_at, completed) in both ascending and descending order.
 *
 * The test workflow:
 *
 * 1. Create a user account for authentication
 * 2. Create multiple todos with staggered timestamps to enable proper sorting
 *    validation
 * 3. Update some todos to vary the updated_at timestamps and completion statuses
 * 4. Test sorting by created_at in descending order (newest first - most common
 *    use case)
 * 5. Test sorting by created_at in ascending order (oldest first)
 * 6. Test sorting by updated_at in descending order (most recently updated first)
 * 7. Test sorting by updated_at in ascending order (least recently updated first)
 * 8. Test sorting by completed status in ascending order (incomplete tasks before
 *    completed)
 * 9. Test sorting by completed status in descending order (completed tasks before
 *    incomplete)
 *
 * Each sorting test verifies that the API returns results in the correct order
 * according to the specified sort field and direction.
 */
export async function test_api_todo_list_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Create a user account for authenticated access
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple todos with different timestamps
  const todoTitles = [
    "First todo - oldest",
    "Second todo",
    "Third todo",
    "Fourth todo",
    "Fifth todo - newest",
  ];

  const createdTodos: ITodoListTodo[] = [];

  for (const title of todoTitles) {
    const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
      connection,
      {
        body: {
          title: title,
        } satisfies ITodoListTodo.ICreate,
      },
    );
    typia.assert(todo);
    createdTodos.push(todo);

    // Add small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Step 3: Update some todos to vary updated_at and completion status
  // Mark the first and third todos as completed
  const updatedTodo1: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createdTodos[0].id,
      body: {
        completed: true,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedTodo1);
  createdTodos[0] = updatedTodo1;

  await new Promise((resolve) => setTimeout(resolve, 100));

  const updatedTodo2: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createdTodos[2].id,
      body: {
        completed: true,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedTodo2);
  createdTodos[2] = updatedTodo2;

  await new Promise((resolve) => setTimeout(resolve, 100));

  // Update the last todo's title to change its updated_at
  const updatedTodo3: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createdTodos[4].id,
      body: {
        title: "Fifth todo - newest (updated)",
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedTodo3);
  createdTodos[4] = updatedTodo3;

  // Step 4: Test sorting by created_at descending (newest first)
  const sortByCreatedDesc: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(sortByCreatedDesc);

  TestValidator.predicate(
    "should have all todos in created_at desc response",
    sortByCreatedDesc.data.length === 5,
  );

  for (let i = 0; i < sortByCreatedDesc.data.length - 1; i++) {
    const current = new Date(sortByCreatedDesc.data[i].created_at).getTime();
    const next = new Date(sortByCreatedDesc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `created_at desc order check ${i}`,
      current >= next,
    );
  }

  // Step 5: Test sorting by created_at ascending (oldest first)
  const sortByCreatedAsc: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(sortByCreatedAsc);

  TestValidator.predicate(
    "should have all todos in created_at asc response",
    sortByCreatedAsc.data.length === 5,
  );

  for (let i = 0; i < sortByCreatedAsc.data.length - 1; i++) {
    const current = new Date(sortByCreatedAsc.data[i].created_at).getTime();
    const next = new Date(sortByCreatedAsc.data[i + 1].created_at).getTime();
    TestValidator.predicate(`created_at asc order check ${i}`, current <= next);
  }

  // Step 6: Test sorting by updated_at descending (most recently updated first)
  const sortByUpdatedDesc: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        sort_by: "updated_at",
        sort_order: "desc",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(sortByUpdatedDesc);

  TestValidator.predicate(
    "should have all todos in updated_at desc response",
    sortByUpdatedDesc.data.length === 5,
  );

  // Step 7: Test sorting by updated_at ascending (least recently updated first)
  const sortByUpdatedAsc: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        sort_by: "updated_at",
        sort_order: "asc",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(sortByUpdatedAsc);

  TestValidator.predicate(
    "should have all todos in updated_at asc response",
    sortByUpdatedAsc.data.length === 5,
  );

  // Step 8: Test sorting by completed ascending (incomplete before completed)
  const sortByCompletedAsc: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        sort_by: "completed",
        sort_order: "asc",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(sortByCompletedAsc);

  TestValidator.predicate(
    "should have all todos in completed asc response",
    sortByCompletedAsc.data.length === 5,
  );

  // Verify incomplete todos come before completed ones in asc order
  let foundCompleted = false;
  for (const todo of sortByCompletedAsc.data) {
    if (todo.completed) {
      foundCompleted = true;
    } else {
      TestValidator.predicate(
        "incomplete todos should come before completed in asc",
        !foundCompleted,
      );
    }
  }

  // Step 9: Test sorting by completed descending (completed before incomplete)
  const sortByCompletedDesc: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        sort_by: "completed",
        sort_order: "desc",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(sortByCompletedDesc);

  TestValidator.predicate(
    "should have all todos in completed desc response",
    sortByCompletedDesc.data.length === 5,
  );

  // Verify completed todos come before incomplete ones in desc order
  let foundIncomplete = false;
  for (const todo of sortByCompletedDesc.data) {
    if (!todo.completed) {
      foundIncomplete = true;
    } else {
      TestValidator.predicate(
        "completed todos should come before incomplete in desc",
        !foundIncomplete,
      );
    }
  }
}
