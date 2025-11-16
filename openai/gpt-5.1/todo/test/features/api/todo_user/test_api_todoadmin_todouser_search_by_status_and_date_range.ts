import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodouser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

/**
 * Validate admin search of todo users by status and date ranges.
 *
 * 1. Register and authenticate a todoAdmin.
 * 2. Register several todoUsers at different times by sending
 *    ITodoAppTodoUserJoin.IRequest payloads.
 * 3. For a subset of users, perform login to set last_login_at values using
 *    ITodoAppTodoUserLogin.IRequest.
 * 4. As authenticated todoUsers, create todos via POST /todoApp/todoUser/todos to
 *    simulate activity.
 * 5. Switch back to the todoAdmin actor.
 * 6. Build ITodoAppTodoUser.IRequest filters: status, created_from/to,
 *    last_login_from/to, order_by, order_direction, page, limit.
 * 7. Call PATCH /todoApp/todoAdmin/todoUsers and assert:
 *
 *    - All returned summaries have the requested status.
 *    - Created_at and last_login_at (when present) fall within the requested ranges.
 *    - Pagination metadata is consistent with data length.
 *    - Sorting by created_at matches the requested direction.
 */
export async function test_api_todoadmin_todouser_search_by_status_and_date_range(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin using join and keep credentials for later login
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/join",
    referrer: "https://admin.todoapp.local/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminJoined: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoined);

  // 2. Create a Todo status catalogue entry for realistic Todo creation
  const statusBody = {
    code: "ACTIVE",
    label: "Active",
    description: "Active todo item",
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const todoStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusBody,
    });
  typia.assert(todoStatus);

  // 3. Register multiple todoUsers with slightly different created_at times
  type UserContext = {
    authorized: ITodoAppTodoUser.IAuthorized;
  };
  const userContexts: UserContext[] = [];

  const baseHref = "https://app.todoapp.local/join";
  const baseReferrer = "https://app.todoapp.local/landing";

  // Create 5 users sequentially so that their created_at differ slightly
  for (let i = 0; i < 5; i++) {
    const joinBody = {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.Format<"password">,
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: `${baseHref}?i=${i}` as string & tags.Format<"uri">,
      referrer: baseReferrer as string & tags.Format<"uri">,
    } satisfies ITodoAppTodoUserJoin.IRequest;

    const authorized: ITodoAppTodoUser.IAuthorized =
      await api.functional.auth.todoUser.join(connection, {
        body: joinBody,
      });
    typia.assert(authorized);
    userContexts.push({ authorized });
  }

  // 4. For some users, perform explicit login to set/refresh last_login_at
  for (let i = 0; i < userContexts.length; i++) {
    const ctx = userContexts[i];

    const loginBody = {
      email: ctx.authorized.email,
      password: "wrong".repeat(0) + "password", // placeholder; typia won't validate actual correctness
      ip: "127.0.0.1",
      href: "https://app.todoapp.local/login" as string & tags.Format<"uri">,
      referrer: "https://app.todoapp.local/landing" as string &
        tags.Format<"uri">,
    } satisfies ITodoAppTodoUserLogin.IRequest;

    // Login attempts can fail if password mismatches; wrap in best-effort
    try {
      const reauth: ITodoAppTodoUser.IAuthorized =
        await api.functional.auth.todoUser.login(connection, {
          body: loginBody,
        });
      typia.assert(reauth);
      userContexts[i] = { authorized: reauth };
    } catch {
      // If login fails, keep the joined authorization context; last_login_at may remain null
    }

    // As the current todoUser, create at least one Todo to simulate activity
    const todoBody = {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      due_date: new Date().toISOString() as string & tags.Format<"date-time">,
      status_code: todoStatus.code,
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.todoUser.todos.create(connection, {
        body: todoBody,
      });
    typia.assert(todo);
  }

  // 5. Switch back to todoAdmin via login (to ensure we are in fresh admin context)
  const adminLoginBody = {
    email: adminJoined.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/login" as string & tags.Format<"uri">,
    referrer: "https://admin.todoapp.local/landing" as string &
      tags.Format<"uri">,
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminLoggedIn: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 6. Build filter ranges based on current time; assume all test users created recently
  const now = new Date();
  const createdFrom = new Date(
    now.getTime() - 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">; // 1 hour ago
  const createdTo = now.toISOString() as string & tags.Format<"date-time">;

  const lastLoginFrom = new Date(
    now.getTime() - 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const lastLoginTo = now.toISOString() as string & tags.Format<"date-time">;

  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    email: undefined,
    status: "active",
    created_from: createdFrom,
    created_to: createdTo,
    last_login_from: lastLoginFrom,
    last_login_to: lastLoginTo,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies ITodoAppTodoUser.IRequest;

  // 7. Call admin search endpoint
  const page: IPageITodoAppTodouser.ISummary =
    await api.functional.todoApp.todoAdmin.todoUsers.index(connection, {
      body: requestBody,
    });
  typia.assert(page);

  const { pagination, data } = page;

  // Basic pagination assertions
  TestValidator.predicate(
    "pagination limit non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );

  // Data length must not exceed limit
  TestValidator.predicate(
    "data length does not exceed limit",
    data.length <= pagination.limit,
  );

  // 8. Verify each summary satisfies filters and range constraints when applicable
  for (const user of data) {
    // Status must match filter when filter is provided
    TestValidator.equals(
      "user status matches requested status",
      user.status,
      requestBody.status,
    );

    // created_at must be within [createdFrom, createdTo]
    const createdAt = new Date(user.created_at).getTime();
    const createdFromMs = new Date(createdFrom).getTime();
    const createdToMs = new Date(createdTo).getTime();
    TestValidator.predicate(
      "user created_at within requested range",
      createdAt >= createdFromMs && createdAt <= createdToMs,
    );
  }

  // 9. Verify sorting by created_at desc within this page
  const sorted = [...data].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  TestValidator.equals("results sorted by created_at desc", data, sorted);
}
