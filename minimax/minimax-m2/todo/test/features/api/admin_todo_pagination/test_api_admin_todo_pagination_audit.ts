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

export async function test_api_admin_todo_pagination_audit(
  connection: api.IConnection,
) {
  // Create multiple member accounts for large-scale pagination testing
  const memberEmails = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"email">>(),
  );

  const members = await ArrayUtil.asyncMap(memberEmails, async (email) => {
    const member = await api.functional.auth.member.join.registerMember(
      connection,
      {
        body: {
          email: email,
          first_name: RandomGenerator.name(1),
          last_name: RandomGenerator.name(1),
          status: "active",
        } satisfies ITodoAppMember.ICreate,
      },
    );
    typia.assert(member);
    return member;
  });

  // Create numerous todos across different member accounts
  const todos: ITodoAppTodo[] = [];
  for (const member of members) {
    // Switch to member account
    await api.functional.auth.member.login.authenticateMember(connection, {
      body: {
        email: member.email,
        password: "1234",
        ip: "192.168.1.1",
        href: "https://example.com",
        referrer: "https://google.com",
      } satisfies ITodoAppMember.ILogin,
    });

    // Create 15 todos per member for a total of 75 todos
    const memberTodos = await ArrayUtil.asyncRepeat(15, async () => {
      const todo = await api.functional.todoApp.member.todos.create(
        connection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.content({ paragraphs: 1 }),
            status: RandomGenerator.pick([
              "pending",
              "in_progress",
              "completed",
            ] as const),
            priority: RandomGenerator.pick([
              "low",
              "medium",
              "high",
              "urgent",
            ] as const),
            category: RandomGenerator.pick([
              "work",
              "personal",
              "shopping",
              "health",
            ] as const),
            due_date: new Date(
              Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          } satisfies ITodoAppTodo.ICreate,
        },
      );
      typia.assert(todo);
      return todo;
    });

    todos.push(...memberTodos);
  }

  // Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password_hash: "hashed_password_123",
      first_name: "Admin",
      last_name: "User",
      role_level: "super_admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "password123",
      ip: "192.168.1.100",
      href: "https://admin.example.com",
      referrer: "https://admin.example.com/dashboard",
    } satisfies ITodoAppAdministrator.ILogin,
  });

  // Test pagination with various page sizes
  const pageSizes = [5, 10, 20, 50];

  for (const pageSize of pageSizes) {
    // Test first page
    const firstPage = await api.functional.todoApp.admin.todos.index(
      connection,
      {
        body: {
          page: 1,
          limit: pageSize,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies ITodoAppTodo.IRequest,
      },
    );
    typia.assert(firstPage);

    TestValidator.equals(
      "first page limit matches request",
      firstPage.pagination.limit,
      pageSize,
    );
    TestValidator.equals(
      "first page data count",
      firstPage.data.length,
      Math.min(pageSize, todos.length),
    );
    TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
    TestValidator.equals(
      "total pages calculated correctly",
      firstPage.pagination.pages,
      Math.ceil(todos.length / pageSize),
    );
    TestValidator.equals(
      "total records matches todos created",
      firstPage.pagination.records,
      todos.length,
    );

    // Test last page if there are multiple pages
    if (firstPage.pagination.pages > 1) {
      const lastPage = await api.functional.todoApp.admin.todos.index(
        connection,
        {
          body: {
            page: firstPage.pagination.pages,
            limit: pageSize,
            sort_by: "created_at",
            sort_order: "desc",
          } satisfies ITodoAppTodo.IRequest,
        },
      );
      typia.assert(lastPage);

      TestValidator.equals(
        "last page number matches total pages",
        lastPage.pagination.current,
        firstPage.pagination.pages,
      );
      const expectedLastPageItems =
        todos.length % pageSize === 0 ? pageSize : todos.length % pageSize;
      TestValidator.equals(
        "last page has correct item count",
        lastPage.data.length,
        expectedLastPageItems,
      );
    }

    // Test boundary conditions - invalid page numbers
    await TestValidator.error("invalid page number should fail", async () => {
      await api.functional.todoApp.admin.todos.index(connection, {
        body: {
          page: -1,
          limit: pageSize,
        } satisfies ITodoAppTodo.IRequest,
      });
    });

    await TestValidator.error(
      "page beyond total pages should fail",
      async () => {
        await api.functional.todoApp.admin.todos.index(connection, {
          body: {
            page: firstPage.pagination.pages + 100,
            limit: pageSize,
          } satisfies ITodoAppTodo.IRequest,
        });
      },
    );

    // Test limit boundary conditions
    const invalidLimitPage = await api.functional.todoApp.admin.todos.index(
      connection,
      {
        body: {
          page: 1,
          limit: 101, // Exceeds maximum limit of 100
        } satisfies ITodoAppTodo.IRequest,
      },
    );
    typia.assert(invalidLimitPage);
    TestValidator.equals(
      "limit capped at maximum 100",
      invalidLimitPage.pagination.limit,
      100,
    );
  }

  // Test search and filter pagination
  const searchPage = await api.functional.todoApp.admin.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "work",
        status: ["pending", "in_progress"] as const,
        priority: ["high", "urgent"] as const,
        sort_by: "priority",
        sort_order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchPage);

  TestValidator.equals(
    "search results have pagination metadata",
    searchPage.pagination.records <= todos.length,
    true,
  );
  TestValidator.equals(
    "search results limited to 10",
    searchPage.data.length <= 10,
    true,
  );

  // Validate that todos from all users are accessible to admin
  const allTodosPage = await api.functional.todoApp.admin.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allTodosPage);

  TestValidator.equals(
    "admin can access todos from all members",
    allTodosPage.pagination.records,
    todos.length,
  );
  TestValidator.equals(
    "all user todos visible in admin view",
    allTodosPage.data.length,
    Math.min(100, todos.length),
  );

  // Test pagination metadata consistency across different sort orders
  const ascPage = await api.functional.todoApp.admin.todos.index(connection, {
    body: {
      page: 1,
      limit: 20,
      sort_by: "created_at",
      sort_order: "asc",
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(ascPage);

  TestValidator.equals(
    "ascending sort has consistent metadata",
    ascPage.pagination.records,
    todos.length,
  );
  TestValidator.equals(
    "ascending sort page limit correct",
    ascPage.pagination.limit,
    20,
  );
}
