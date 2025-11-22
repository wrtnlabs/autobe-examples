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

/**
 * Test comprehensive todo access for administrative oversight across all system
 * users.
 *
 * This test validates that administrators have complete visibility into all
 * member todo items throughout the system. The scenario involves:
 *
 * 1. Creating multiple member accounts with unique profiles
 * 2. Each member creates diverse todo items with different properties (status,
 *    priority, category)
 * 3. Authenticating as administrator to verify system-wide access
 * 4. Confirming admin can retrieve and view all member todos without restrictions
 * 5. Validating proper administrative access controls and comprehensive oversight
 *    capabilities
 *
 * This ensures proper role-based access control and validates that
 * administrators can effectively monitor and manage all user activities across
 * the todo management system.
 */
export async function test_api_admin_todo_global_oversight(
  connection: api.IConnection,
) {
  // === PHASE 1: Create Multiple Member Accounts ===
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member3Email = typia.random<string & tags.Format<"email">>();

  // Create first member account
  const member1: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: member1Email,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member1);

  // Create second member account
  const member2: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: member2Email,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member2);

  // Create third member account
  const member3: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: member3Email,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member3);

  // === PHASE 2: Create Diverse Todo Items for Each Member ===
  // Switch to member1 and create todos
  await api.functional.auth.member.login.authenticateMember(connection, {
    body: {
      email: member1Email,
      password: "password",
      href: "https://example.com",
      referrer: "https://google.com",
    } satisfies ITodoAppMember.ILogin,
  });

  // Member1 creates high-priority work todo
  const member1Todo1: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "pending",
        priority: "high",
        category: "work",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(member1Todo1);

  // Member1 creates completed personal todo
  const member1Todo2: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "completed",
        priority: "medium",
        category: "personal",
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(member1Todo2);

  // Switch to member2 and create todos
  await api.functional.auth.member.login.authenticateMember(connection, {
    body: {
      email: member2Email,
      password: "password",
      href: "https://example.com",
      referrer: "https://google.com",
    } satisfies ITodoAppMember.ILogin,
  });

  // Member2 creates urgent shopping todo
  const member2Todo1: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "in_progress",
        priority: "urgent",
        category: "shopping",
        due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(member2Todo1);

  // Member2 creates low-priority learning todo
  const member2Todo2: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "pending",
        priority: "low",
        category: "learning",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(member2Todo2);

  // Switch to member3 and create todos
  await api.functional.auth.member.login.authenticateMember(connection, {
    body: {
      email: member3Email,
      password: "password",
      href: "https://example.com",
      referrer: "https://google.com",
    } satisfies ITodoAppMember.ILogin,
  });

  // Member3 creates health-related todo
  const member3Todo1: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "pending",
        priority: "medium",
        category: "health",
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(member3Todo1);

  // === PHASE 3: Administrator Authentication ===
  const adminEmail = typia.random<string & tags.Format<"email">>();

  // Create administrator account
  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "hashed_password_placeholder",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Authenticate as administrator
  const adminLogin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "admin_password",
        ip: "192.168.1.100",
        href: "https://admin.example.com",
        referrer: "https://system.example.com",
      } satisfies ITodoAppAdministrator.ILogin,
    });
  typia.assert(adminLogin);

  // === PHASE 4: Administrative Todo Oversight Validation ===
  // Administrator retrieves comprehensive list of all todos across system
  const allTodos: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.todos.index(connection, {
      body: {
        page: 1,
        limit: 20,
        include_completed: true,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(allTodos);

  // Validate that admin can see todos from all members
  TestValidator.equals(
    "admin should see todos from all members",
    allTodos.data.length >= 5, // Created 5 todos total across 3 members
    true,
  );

  // Verify admin can see high-priority work todo from member1
  const member1WorkTodo = allTodos.data.find(
    (todo) => todo.title === member1Todo1.title && todo.category === "work",
  );
  TestValidator.predicate(
    "admin should see member1's high-priority work todo",
    member1WorkTodo !== undefined &&
      member1WorkTodo.priority === "high" &&
      member1WorkTodo.status === "pending",
  );

  // Verify admin can see member2's urgent shopping todo
  const member2UrgentTodo = allTodos.data.find(
    (todo) => todo.title === member2Todo1.title && todo.category === "shopping",
  );
  TestValidator.predicate(
    "admin should see member2's urgent shopping todo",
    member2UrgentTodo !== undefined &&
      member2UrgentTodo.priority === "urgent" &&
      member2UrgentTodo.status === "in_progress",
  );

  // Verify admin can see member3's health todo
  const member3HealthTodo = allTodos.data.find(
    (todo) => todo.title === member3Todo1.title && todo.category === "health",
  );
  TestValidator.predicate(
    "admin should see member3's health todo",
    member3HealthTodo !== undefined &&
      member3HealthTodo.priority === "medium" &&
      member3HealthTodo.status === "pending",
  );

  // Validate comprehensive status and priority coverage
  const priorities = allTodos.data.map((todo) => todo.priority);
  const statuses = allTodos.data.map((todo) => todo.status);

  TestValidator.predicate(
    "admin should see todos with various priority levels",
    priorities.includes("high") &&
      priorities.includes("urgent") &&
      priorities.includes("medium") &&
      priorities.includes("low"),
  );

  TestValidator.predicate(
    "admin should see todos in different statuses",
    statuses.includes("pending") &&
      statuses.includes("in_progress") &&
      statuses.includes("completed"),
  );

  // Test admin filtering capabilities
  const highPriorityTodos: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.todos.index(connection, {
      body: {
        page: 1,
        limit: 20,
        priority: ["high", "urgent"],
        include_completed: true,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(highPriorityTodos);

  TestValidator.predicate(
    "admin should filter todos by priority level",
    highPriorityTodos.data.length > 0 &&
      highPriorityTodos.data.every(
        (todo) => todo.priority === "high" || todo.priority === "urgent",
      ),
  );

  const workCategoryTodos: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.todos.index(connection, {
      body: {
        page: 1,
        limit: 20,
        category: "work",
        include_completed: true,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(workCategoryTodos);

  TestValidator.predicate(
    "admin should filter todos by category",
    workCategoryTodos.data.length > 0 &&
      workCategoryTodos.data.every((todo) => todo.category === "work"),
  );

  // Validate pagination works correctly for admin
  const paginatedTodos: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.todos.index(connection, {
      body: {
        page: 1,
        limit: 3, // Small limit to test pagination
        include_completed: true,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(paginatedTodos);

  TestValidator.predicate(
    "admin pagination should limit results correctly",
    paginatedTodos.data.length <= 3 && paginatedTodos.pagination.limit === 3,
  );

  // Final validation: Admin has system-wide visibility
  TestValidator.equals(
    "admin should have complete system oversight",
    allTodos.pagination.records >= 5, // Should see all created todos
    true,
  );
}
