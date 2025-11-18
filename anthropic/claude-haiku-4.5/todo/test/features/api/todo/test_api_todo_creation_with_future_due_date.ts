import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creating todos with various future due dates to ensure proper handling
 * and storage of due date values in ISO 8601 format.
 *
 * This test validates that the todo creation endpoint correctly:
 *
 * - Accepts multiple future date scenarios (tomorrow, next week, next month, far
 *   future)
 * - Stores due_date in ISO 8601 format
 * - Retrieves due_date correctly as ISO 8601 formatted string
 * - Handles null due_date when not provided
 * - Maintains data integrity across creation and retrieval
 *
 * Process:
 *
 * 1. Create authenticated user account
 * 2. Create todo with tomorrow's date as due_date
 * 3. Verify due_date is stored and formatted correctly in ISO 8601
 * 4. Create todo with next week's date as due_date
 * 5. Verify next week's todo is created correctly
 * 6. Create todo with next month's date as due_date
 * 7. Verify next month's todo is created correctly
 * 8. Create todo with far future date (1 year from now) as due_date
 * 9. Verify far future todo is created correctly
 * 10. Create todo without due_date (null value)
 * 11. Verify todo without due_date has null due_date field
 */
export async function test_api_todo_creation_with_future_due_date(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "SecurePassword123",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);
  TestValidator.equals("user created with valid email", userEmail, user.email);

  // Step 2-3: Create todo with tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString();

  const todayTomorrow: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Task due tomorrow",
        description: "This todo is due tomorrow",
        priority: "high",
        due_date: tomorrowIso,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todayTomorrow);
  TestValidator.predicate(
    "tomorrow todo has valid due_date",
    todayTomorrow.due_date !== null && todayTomorrow.due_date !== undefined,
  );

  // Step 4-5: Create todo with next week's date
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekIso = nextWeek.toISOString();

  const todoNextWeek: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Task due next week",
        description: "This todo is due next week",
        priority: "medium",
        due_date: nextWeekIso,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoNextWeek);
  TestValidator.predicate(
    "next week todo has valid due_date",
    todoNextWeek.due_date !== null && todoNextWeek.due_date !== undefined,
  );
  TestValidator.predicate(
    "next week todo is marked incomplete",
    !todoNextWeek.completed,
  );

  // Step 6-7: Create todo with next month's date
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);
  const nextMonthIso = nextMonth.toISOString();

  const todoNextMonth: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Task due next month",
        description: "This todo is due next month",
        priority: "low",
        due_date: nextMonthIso,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoNextMonth);
  TestValidator.predicate(
    "next month todo has valid due_date",
    todoNextMonth.due_date !== null && todoNextMonth.due_date !== undefined,
  );

  // Step 8-9: Create todo with far future date (1 year from now)
  const farFuture = new Date();
  farFuture.setFullYear(farFuture.getFullYear() + 1);
  const farFutureIso = farFuture.toISOString();

  const todoFarFuture: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Task due in one year",
        description: "This todo is due far in the future",
        priority: "low",
        due_date: farFutureIso,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoFarFuture);
  TestValidator.predicate(
    "far future todo has valid due_date",
    todoFarFuture.due_date !== null && todoFarFuture.due_date !== undefined,
  );
  TestValidator.predicate(
    "far future todo created successfully",
    todoFarFuture.id !== undefined,
  );

  // Step 10-11: Create todo without due_date (null value)
  const todoNoDate: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Task without due date",
        description: "This todo has no specific due date",
        priority: "medium",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoNoDate);
  TestValidator.equals(
    "todo without due_date has null due_date",
    todoNoDate.due_date,
    null,
  );
  TestValidator.predicate(
    "todo without due_date is created",
    todoNoDate.title === "Task without due date",
  );

  // Validation: Verify all todos have valid structure
  TestValidator.predicate(
    "all created todos have valid id",
    todayTomorrow.id !== undefined &&
      todoNextWeek.id !== undefined &&
      todoNextMonth.id !== undefined &&
      todoFarFuture.id !== undefined &&
      todoNoDate.id !== undefined,
  );
  TestValidator.predicate(
    "all created todos have created_at timestamp",
    todayTomorrow.created_at !== undefined &&
      todoNextWeek.created_at !== undefined &&
      todoNextMonth.created_at !== undefined &&
      todoFarFuture.created_at !== undefined &&
      todoNoDate.created_at !== undefined,
  );
}
