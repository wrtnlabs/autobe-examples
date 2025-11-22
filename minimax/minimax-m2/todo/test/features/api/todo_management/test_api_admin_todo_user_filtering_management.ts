import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_admin_todo_user_filtering_management(
  connection: api.IConnection,
) {
  // Setup: Create admin user for system management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "secure_admin_password_123",
        first_name: "System",
        last_name: "Administrator",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Login as admin to get proper authentication
  const adminSession: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "secure_admin_password_123",
        ip: "192.168.1.100",
        href: "https://todoapp.example.com/admin",
        referrer: "https://todoapp.example.com/login",
      } satisfies ITodoAppAdministrator.ILogin,
    });
  typia.assert(adminSession);

  // Create multiple member users for comprehensive testing
  const memberEmails = [
    typia.random<string & tags.Format<"email">>(),
    typia.random<string & tags.Format<"email">>(),
    typia.random<string & tags.Format<"email">>(),
  ];

  const memberUsers: ITodoAppMember.IAuthorized[] = [];
  for (const email of memberEmails) {
    const member: ITodoAppMember.IAuthorized =
      await api.functional.auth.member.join.registerMember(connection, {
        body: {
          email: email,
          first_name: RandomGenerator.name(1),
          last_name: RandomGenerator.name(1),
          status: "active",
        } satisfies ITodoAppMember.ICreate,
      });
    typia.assert(member);
    memberUsers.push(member);
  }

  // Switch to first member and create diverse todo items
  await api.functional.auth.member.login.authenticateMember(connection, {
    body: {
      email: memberEmails[0],
      password: "member_password_123",
      ip: "192.168.1.101",
      href: "https://todoapp.example.com/member/dashboard",
      referrer: "https://todoapp.example.com/login",
    } satisfies ITodoAppMember.ILogin,
  });

  const member1Todos: ITodoAppTodo[] = [];
  // Create todos with different statuses, priorities, and categories
  const todo1: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: {
        title: "Complete project proposal",
        description: "Write comprehensive project proposal for Q1",
        status: "pending",
        business_status: "active",
        priority: "high",
        category: "work",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  member1Todos.push(todo1);

  const todo2: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: {
        title: "Review code changes",
        description: "Review pull requests and provide feedback",
        status: "in_progress",
        business_status: "active",
        priority: "medium",
        category: "work",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  member1Todos.push(todo2);

  const todo3: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: {
        title: "Grocery shopping",
        description: "Buy groceries for the week",
        status: "completed",
        business_status: "active",
        priority: "low",
        category: "personal",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);
  member1Todos.push(todo3);

  // Switch to second member and create more todos
  await api.functional.auth.member.login.authenticateMember(connection, {
    body: {
      email: memberEmails[1],
      password: "member_password_123",
      ip: "192.168.1.102",
      href: "https://todoapp.example.com/member/dashboard",
      referrer: "https://todoapp.example.com/login",
    } satisfies ITodoAppMember.ILogin,
  });

  const todo4: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: {
        title: "Fix critical bug",
        description: "Address critical security vulnerability",
        status: "pending",
        business_status: "active",
        priority: "urgent",
        category: "work",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo4);

  const todo5: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: {
        title: "Exercise routine",
        description: "Start 30-minute daily exercise",
        status: "pending",
        business_status: "on_hold",
        priority: "medium",
        category: "health",
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo5);

  // Switch to third member and create additional todos
  await api.functional.auth.member.login.authenticateMember(connection, {
    body: {
      email: memberEmails[2],
      password: "member_password_123",
      ip: "192.168.1.103",
      href: "https://todoapp.example.com/member/dashboard",
      referrer: "https://todoapp.example.com/login",
    } satisfies ITodoAppMember.ILogin,
  });

  const todo6: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: {
        title: "Organize team meeting",
        description: "Schedule and prepare for weekly team meeting",
        status: "cancelled",
        business_status: "active",
        priority: "low",
        category: "work",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo6);

  const todo7: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: {
        title: "Buy birthday gift",
        description: "Purchase gift for friend's birthday",
        status: "completed",
        business_status: "archived",
        priority: "high",
        category: "shopping",
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo7);

  // Test administrative filtering capabilities
  // Switch back to admin for filtering tests
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "secure_admin_password_123",
      ip: "192.168.1.100",
      href: "https://todoapp.example.com/admin/todos",
      referrer: "https://todoapp.example.com/admin/dashboard",
    } satisfies ITodoAppAdministrator.ILogin,
  });

  // Test 1: Filter by specific status (pending)
  const pendingFilterResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.todos.index(connection, {
      body: {
        status: ["pending"],
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(pendingFilterResult);

  TestValidator.equals(
    "pending todos count should be 3",
    pendingFilterResult.data.length,
    3,
  );

  // Validate that only pending todos are returned
  const pendingStatuses = pendingFilterResult.data.map((todo) => todo.status);
  TestValidator.predicate(
    "all returned todos should have pending status",
    pendingStatuses.every((status) => status === "pending"),
  );

  // Test 2: Filter by high priority
  const highPriorityResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.todos.index(connection, {
      body: {
        priority: ["high"],
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(highPriorityResult);

  TestValidator.equals(
    "high priority todos count should be 2",
    highPriorityResult.data.length,
    2,
  );

  // Test 3: Filter by work category
  const workCategoryResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.todos.index(connection, {
      body: {
        category: "work",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(workCategoryResult);

  TestValidator.equals(
    "work category todos count should be 3",
    workCategoryResult.data.length,
    3,
  );

  // Test 4: Filter by business status (active)
  const activeBusinessStatusResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.todos.index(connection, {
      body: {
        business_status: ["active"],
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(activeBusinessStatusResult);

  TestValidator.equals(
    "active business status todos count should be 6",
    activeBusinessStatusResult.data.length,
    6,
  );

  // Test 5: Multiple criteria filter (status: pending AND priority: high)
  const multiCriteriaResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.todos.index(connection, {
      body: {
        status: ["pending"],
        priority: ["high"],
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(multiCriteriaResult);

  TestValidator.equals(
    "pending AND high priority todos count should be 1",
    multiCriteriaResult.data.length,
    1,
  );

  // Test 6: Search functionality
  const searchResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.todos.index(connection, {
      body: {
        search: "project",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchResult);

  TestValidator.equals(
    "search for 'project' should return 1 result",
    searchResult.data.length,
    1,
  );

  // Test 7: Date range filtering (due dates within next 10 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 10);

  const dateRangeResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.todos.index(connection, {
      body: {
        due_date_from: new Date().toISOString(),
        due_date_to: nextWeek.toISOString(),
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(dateRangeResult);

  TestValidator.predicate(
    "date range filter should return todos with due dates in range",
    dateRangeResult.data.every(
      (todo) =>
        !todo.due_date ||
        (new Date(todo.due_date) >= new Date() &&
          new Date(todo.due_date) <= nextWeek),
    ),
  );

  // Test 8: Pagination with filtering
  const paginatedResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.todos.index(connection, {
      body: {
        limit: 2,
        page: 1,
        status: ["pending", "completed"],
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(paginatedResult);

  TestValidator.equals(
    "paginated filtered results should respect limit",
    paginatedResult.data.length,
    2,
  );

  // Test 9: Sorting functionality
  const sortedByDate: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.todos.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortedByDate);

  // Validate descending order by creation date
  for (let i = 0; i < sortedByDate.data.length - 1; i++) {
    const currentDate = new Date(sortedByDate.data[i].created_at);
    const nextDate = new Date(sortedByDate.data[i + 1].created_at);
    TestValidator.predicate(
      `todo ${i} should be created after todo ${i + 1}`,
      currentDate.getTime() >= nextDate.getTime(),
    );
  }

  // Test 10: Include completed todos toggle
  const withCompleted: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.todos.index(connection, {
      body: {
        include_completed: true,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(withCompleted);

  const withoutCompleted: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.todos.index(connection, {
      body: {
        include_completed: false,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(withoutCompleted);

  TestValidator.predicate(
    "including completed should return more todos than excluding them",
    withCompleted.data.length > withoutCompleted.data.length,
  );

  // Final validation: Ensure admin can see all todos across users
  const allTodosResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.todos.index(connection, {
      body: {
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(allTodosResult);

  TestValidator.equals(
    "admin should see all 7 created todos",
    allTodosResult.data.length,
    7,
  );

  // Validate that todos from different members are present
  const uniqueMemberTodos = new Set(allTodosResult.data.map((todo) => todo.id));
  TestValidator.predicate(
    "admin can see todos from all members",
    uniqueMemberTodos.size === allTodosResult.data.length,
  );
}
