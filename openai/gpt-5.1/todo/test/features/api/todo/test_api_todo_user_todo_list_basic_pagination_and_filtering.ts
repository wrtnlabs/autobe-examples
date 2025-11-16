import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

/**
 * Basic pagination and filtering behavior for todoUser todo listing.
 *
 * This E2E test exercises the core happy-path flow for listing todos belonging
 * to a single authenticated todo user through `PATCH /todoApp/todoUser/todos`.
 *
 * Business steps
 *
 * 1. Register a todoAdmin and obtain admin authorization context.
 * 2. As todoAdmin, register a default active Todo status (e.g. `ACTIVE`).
 * 3. Register a todoUser and obtain user authorization context.
 * 4. As todoUser, create multiple Todo items with varying titles and due dates,
 *    some explicitly specifying `status_code` and some relying on the default.
 * 5. Call the list endpoint with explicit pagination (page=1, limit=2) and no
 *    additional filters and validate pagination metadata and contents.
 * 6. Optionally, call the list endpoint again with page=2 to validate second-page
 *    behavior and the boundary on the last page.
 */
export async function test_api_todo_user_todo_list_basic_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register todoAdmin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://todo-app.local/admin/join",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a default active Todo status as todoAdmin
  const statusCode = "ACTIVE";
  const statusCreateBody = {
    code: statusCode,
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert(createdStatus);

  TestValidator.equals(
    "created status code should match request",
    createdStatus.code,
    statusCreateBody.code,
  );
  TestValidator.predicate(
    "created status should be default and active",
    createdStatus.is_default === true && createdStatus.is_active === true,
  );

  // 3. Register and authenticate todoUser
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const userJoinBody = {
    email: userEmail,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://todo-app.local/join",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorized);

  // Ensure login also works (refreshes token) – though join already authenticated
  const userLoginBody = {
    email: userEmail,
    password: userJoinBody.password,
    ip: "127.0.0.1",
    href: "https://todo-app.local/login",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const userAuthorizedFromLogin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(userAuthorizedFromLogin);

  TestValidator.equals(
    "joined user id should match logged-in user id",
    userAuthorizedFromLogin.id,
    userAuthorized.id,
  );

  // 4. As todoUser, create multiple todos
  const totalTodos = 4;
  const createdTodos: ITodoAppTodo[] = [];

  for (let i = 0; i < totalTodos; i++) {
    const title = `Todo #${i + 1} - ${RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 6,
    })}`;

    const baseDate = new Date();
    const dueDate: string & tags.Format<"date-time"> = RandomGenerator.date(
      baseDate,
      1000 * 60 * 60 * 24 * 7,
    ).toISOString();

    const createBody = {
      title,
      description:
        i % 2 === 0 ? RandomGenerator.paragraph({ sentences: 2 }) : null,
      due_date: dueDate,
      status_code: i % 2 === 0 ? statusCode : null,
    } satisfies ITodoAppTodo.ICreate;

    const created: ITodoAppTodo =
      await api.functional.todoApp.todoUser.todos.create(connection, {
        body: createBody,
      });
    typia.assert(created);

    createdTodos.push(created);
  }

  TestValidator.equals(
    "should have created expected number of todos",
    createdTodos.length,
    totalTodos,
  );

  // 5. List todos - page 1, limit 2, no filters
  const listRequestPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ITodoAppTodo.IRequest;

  const page1: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.todoUser.todos.index(connection, {
      body: listRequestPage1,
    });
  typia.assert(page1);

  const pagination1 = page1.pagination;
  const data1 = page1.data;

  TestValidator.equals(
    "pagination current page should be 1-based index minus one (0)",
    pagination1.current,
    0,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    pagination1.limit,
    listRequestPage1.limit,
  );
  TestValidator.equals(
    "pagination records should be at least created todos",
    pagination1.records >= totalTodos,
    true,
  );
  TestValidator.equals(
    "first page data length should equal limit or remaining records",
    data1.length,
    Math.min(listRequestPage1.limit, pagination1.records),
  );

  // Validate summary fields for each item
  for (const summary of data1) {
    const s: ITodoAppTodo.ISummary = summary;
    typia.assert<ITodoAppTodo.ISummary>(s);

    TestValidator.predicate(
      "summary id must be a non-empty uuid string",
      typeof s.id === "string" && s.id.length > 0,
    );
    TestValidator.predicate(
      "summary title must be non-empty",
      typeof s.title === "string" && s.title.trim().length > 0,
    );
    TestValidator.predicate(
      "summary status must be non-empty string",
      typeof s.status === "string" && s.status.length > 0,
    );
  }

  // 6. Optionally list page 2 to verify boundary behavior
  if (pagination1.pages > 1) {
    const listRequestPage2 = {
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: listRequestPage1.limit,
    } satisfies ITodoAppTodo.IRequest;

    const page2: IPageITodoAppTodo.ISummary =
      await api.functional.todoApp.todoUser.todos.index(connection, {
        body: listRequestPage2,
      });
    typia.assert(page2);

    const pagination2 = page2.pagination;
    const data2 = page2.data;

    TestValidator.equals(
      "second page current index should be 1",
      pagination2.current,
      1,
    );
    TestValidator.equals(
      "second page limit should match requested limit",
      pagination2.limit,
      listRequestPage2.limit,
    );

    TestValidator.predicate(
      "second page data length must be > 0 when pages > 1",
      data2.length > 0,
    );

    for (const summary of data2) {
      const s: ITodoAppTodo.ISummary = summary;
      typia.assert<ITodoAppTodo.ISummary>(s);
    }
  }
}
