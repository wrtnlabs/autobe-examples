import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test advanced filtering by category values and business workflow status.
 *
 * Validates that todo items can be precisely filtered by category and business
 * workflow status (active, on_hold, archived). Creates multiple todos with
 * different categories and business statuses, then verifies exact matching for
 * categories and workflow status filtering to ensure proper task organization
 * and archival management.
 */
export async function test_api_member_todo_category_business_status(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        status: "active",
        first_name: "Test",
        last_name: "User",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create diverse todo items with different categories and business statuses
  const todos: ITodoAppTodo[] = [];

  // Work category todos
  const workActiveTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "Complete project proposal",
        category: "work",
        business_status: "active",
        priority: "high",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(workActiveTodo);
  todos.push(workActiveTodo);

  const workOnHoldTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "Review quarterly reports",
        category: "work",
        business_status: "on_hold",
        priority: "medium",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(workOnHoldTodo);
  todos.push(workOnHoldTodo);

  const workArchivedTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "Submit tax documents",
        category: "work",
        business_status: "archived",
        priority: "urgent",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(workArchivedTodo);
  todos.push(workArchivedTodo);

  // Personal category todos
  const personalActiveTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "Plan weekend trip",
        category: "personal",
        business_status: "active",
        priority: "medium",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(personalActiveTodo);
  todos.push(personalActiveTodo);

  const personalArchivedTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "Call family members",
        category: "personal",
        business_status: "archived",
        priority: "low",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(personalArchivedTodo);
  todos.push(personalArchivedTodo);

  // Shopping category todos
  const shoppingActiveTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "Buy groceries",
        category: "shopping",
        business_status: "active",
        priority: "medium",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(shoppingActiveTodo);
  todos.push(shoppingActiveTodo);

  const shoppingOnHoldTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "Research new laptop",
        category: "shopping",
        business_status: "on_hold",
        priority: "high",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(shoppingOnHoldTodo);
  todos.push(shoppingOnHoldTodo);

  // Step 3: Test category filtering - work category
  const workTodosResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(connection, {
      body: {
        category: "work",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(workTodosResult);

  // Verify work category filtering
  TestValidator.equals(
    "work category filtering count",
    workTodosResult.data.length,
    3,
  );
  TestValidator.predicate(
    "all results have work category",
    workTodosResult.data.every((todo) => todo.category === "work"),
  );

  // Verify specific work todos are present
  const workTodoIds = workTodosResult.data.map((todo) => todo.id);
  TestValidator.predicate(
    "contains work active todo",
    workTodoIds.includes(workActiveTodo.id),
  );
  TestValidator.predicate(
    "contains work on_hold todo",
    workTodoIds.includes(workOnHoldTodo.id),
  );
  TestValidator.predicate(
    "contains work archived todo",
    workTodoIds.includes(workArchivedTodo.id),
  );

  // Step 4: Test category filtering - shopping category
  const shoppingTodosResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(connection, {
      body: {
        category: "shopping",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(shoppingTodosResult);

  // Verify shopping category filtering
  TestValidator.equals(
    "shopping category filtering count",
    shoppingTodosResult.data.length,
    2,
  );
  TestValidator.predicate(
    "all results have shopping category",
    shoppingTodosResult.data.every((todo) => todo.category === "shopping"),
  );

  // Verify specific shopping todos are present
  const shoppingTodoIds = shoppingTodosResult.data.map((todo) => todo.id);
  TestValidator.predicate(
    "contains shopping active todo",
    shoppingTodoIds.includes(shoppingActiveTodo.id),
  );
  TestValidator.predicate(
    "contains shopping on_hold todo",
    shoppingTodoIds.includes(shoppingOnHoldTodo.id),
  );

  // Step 5: Test business_status filtering - active status
  const activeTodosResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(connection, {
      body: {
        business_status: ["active"],
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(activeTodosResult);

  // Verify active status filtering
  TestValidator.equals(
    "active status filtering count",
    activeTodosResult.data.length,
    3,
  );
  TestValidator.predicate(
    "all results have active status",
    activeTodosResult.data.every((todo) => todo.business_status === "active"),
  );

  // Verify specific active todos are present
  const activeTodoIds = activeTodosResult.data.map((todo) => todo.id);
  TestValidator.predicate(
    "contains work active todo",
    activeTodoIds.includes(workActiveTodo.id),
  );
  TestValidator.predicate(
    "contains personal active todo",
    activeTodoIds.includes(personalActiveTodo.id),
  );
  TestValidator.predicate(
    "contains shopping active todo",
    activeTodoIds.includes(shoppingActiveTodo.id),
  );

  // Step 6: Test business_status filtering - archived status
  const archivedTodosResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(connection, {
      body: {
        business_status: ["archived"],
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(archivedTodosResult);

  // Verify archived status filtering
  TestValidator.equals(
    "archived status filtering count",
    archivedTodosResult.data.length,
    3,
  );
  TestValidator.predicate(
    "all results have archived status",
    archivedTodosResult.data.every(
      (todo) => todo.business_status === "archived",
    ),
  );

  // Verify specific archived todos are present
  const archivedTodoIds = archivedTodosResult.data.map((todo) => todo.id);
  TestValidator.predicate(
    "contains work archived todo",
    archivedTodoIds.includes(workArchivedTodo.id),
  );
  TestValidator.predicate(
    "contains personal archived todo",
    archivedTodoIds.includes(personalArchivedTodo.id),
  );

  // Step 7: Test combined filtering - work category with active status
  const workActiveResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(connection, {
      body: {
        category: "work",
        business_status: ["active"],
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(workActiveResult);

  // Verify combined filtering
  TestValidator.equals(
    "work + active filtering count",
    workActiveResult.data.length,
    1,
  );
  TestValidator.equals(
    "filtered todo matches work active",
    workActiveResult.data[0].id,
    workActiveTodo.id,
  );

  // Step 8: Test combined filtering - shopping category with on_hold status
  const shoppingOnHoldResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(connection, {
      body: {
        category: "shopping",
        business_status: ["on_hold"],
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(shoppingOnHoldResult);

  // Verify combined filtering
  TestValidator.equals(
    "shopping + on_hold filtering count",
    shoppingOnHoldResult.data.length,
    1,
  );
  TestValidator.equals(
    "filtered todo matches shopping on_hold",
    shoppingOnHoldResult.data[0].id,
    shoppingOnHoldTodo.id,
  );

  // Step 9: Test non-matching filters - work category with archived status (should be empty)
  const workArchivedResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(connection, {
      body: {
        category: "work",
        business_status: ["archived"],
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(workArchivedResult);

  // Verify no false positives
  TestValidator.equals(
    "work + archived filtering count",
    workArchivedResult.data.length,
    1,
  );
  TestValidator.equals(
    "filtered todo matches work archived",
    workArchivedResult.data[0].id,
    workArchivedTodo.id,
  );

  // Step 10: Test empty result - non-existent category
  const nonExistentResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(connection, {
      body: {
        category: "non-existent-category",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(nonExistentResult);

  // Verify empty results for non-existent category
  TestValidator.equals(
    "non-existent category count",
    nonExistentResult.data.length,
    0,
  );
}
