import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoAdminAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoAdminAudit";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminAudit";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

/**
 * Validate pagination boundary behavior for admin audit listing on a todo.
 *
 * Business flow:
 *
 * 1. Register a todoAdmin via /auth/todoAdmin/join (admin token stored into
 *    connection by SDK).
 * 2. As admin, create at least one Todo status so that todo creation is valid.
 * 3. Register a todoUser via /auth/todoUser/join (connection now authenticated as
 *    todoUser).
 * 4. As todoUser, create a single todo via /todoApp/todoUser/todos.create and
 *    capture its id.
 * 5. Switch back to admin via /auth/todoAdmin/login so the connection is again an
 *    admin.
 * 6. Call PATCH /todoApp/todoAdmin/todos/{todoId}/adminAudits with page=1 and a
 *    modest limit (5) using ITodoAppTodoAdminAudit.IRequest. Record pagination
 *    metadata and data length.
 * 7. Compute a page index strictly beyond the last available page (pages+1 when
 *    pages>0, or 1 when pages===0) and call the same endpoint again with that
 *    page and same limit.
 * 8. Assert that pagination.limit, pagination.records, and pagination.pages are
 *    identical between the two responses, proving stable total counts.
 * 9. Assert that pagination.current in both responses is within [0, pages] as
 *    required by IPage.IPagination.
 * 10. If pages===0, assert that both responses have empty data arrays, current===0,
 *     and records===0.
 * 11. If pages>0, assert that the first page has between 1 and limit records and
 *     that the beyond-last-page call returns an empty data array while keeping
 *     total counts intact.
 */
export async function test_api_todo_admin_audit_list_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin and keep its email for later login
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: null,
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create at least one Todo status so that todos are valid
  const todoStatusBody = {
    code: RandomGenerator.alphabets(8).toUpperCase(),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    group: null,
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: todoStatusBody,
    });
  typia.assert(status);

  // 3. Register a todoUser (connection token switches to todoUser)
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const userJoinBody = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://todo-app.test/join",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const todoUserAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(todoUserAuthorized);

  // 4. As todoUser, create a single todo
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: null,
    status_code: status.code,
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo = await api.functional.todoApp.todoUser.todos.create(
    connection,
    {
      body: todoCreateBody,
    },
  );
  typia.assert(todo);

  // 5. Switch back to admin using login (token is updated by SDK)
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.todo-app.test/login",
    referrer: "https://admin.todo-app.test/login-form",
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminLoginAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 6. First admin audit list call for the todo
  const limit = 5 as number & tags.Type<"int32">;

  const firstRequest: ITodoAppTodoAdminAudit.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit,
    action: undefined,
    field_name: undefined,
    admin_id: undefined,
    created_from: undefined,
    created_to: undefined,
  };

  const firstPage: IPageITodoAppTodoAdminAudit.ISummary =
    await api.functional.todoApp.todoAdmin.todos.adminAudits.index(connection, {
      todoId: todo.id,
      body: firstRequest,
    });
  typia.assert(firstPage);

  const firstPagination = firstPage.pagination;
  const firstData = firstPage.data;

  // Basic invariants: non-negative pagination numbers
  TestValidator.predicate(
    "first pagination current is non-negative",
    firstPagination.current >= 0,
  );
  TestValidator.predicate(
    "first pagination limit is non-negative",
    firstPagination.limit >= 0,
  );
  TestValidator.predicate(
    "first pagination records is non-negative",
    firstPagination.records >= 0,
  );
  TestValidator.predicate(
    "first pagination pages is non-negative",
    firstPagination.pages >= 0,
  );

  const pages = firstPagination.pages;

  // 7. Compute a page index strictly beyond the last available page
  const beyondLastPageIndex: number & tags.Type<"int32"> = (
    pages === 0 ? 1 : pages + 1
  ) as number & tags.Type<"int32">;

  const secondRequest: ITodoAppTodoAdminAudit.IRequest = {
    page: beyondLastPageIndex,
    limit,
    action: undefined,
    field_name: undefined,
    admin_id: undefined,
    created_from: undefined,
    created_to: undefined,
  };

  const secondPage: IPageITodoAppTodoAdminAudit.ISummary =
    await api.functional.todoApp.todoAdmin.todos.adminAudits.index(connection, {
      todoId: todo.id,
      body: secondRequest,
    });
  typia.assert(secondPage);

  const secondPagination = secondPage.pagination;
  const secondData = secondPage.data;

  // 8. pagination.limit, records, pages must be stable across requests
  TestValidator.equals(
    "limit is stable across pagination requests",
    secondPagination.limit,
    firstPagination.limit,
  );
  TestValidator.equals(
    "records is stable across pagination requests",
    secondPagination.records,
    firstPagination.records,
  );
  TestValidator.equals(
    "pages is stable across pagination requests",
    secondPagination.pages,
    firstPagination.pages,
  );

  // 9. pagination.current must be within [0, pages]
  TestValidator.predicate(
    "first current within [0, pages]",
    firstPagination.current >= 0 &&
      firstPagination.current <= firstPagination.pages,
  );
  TestValidator.predicate(
    "second current within [0, pages]",
    secondPagination.current >= 0 &&
      secondPagination.current <= secondPagination.pages,
  );

  // 10 & 11. Data behavior depending on pages
  if (pages === 0) {
    TestValidator.equals(
      "no records: first data is empty",
      firstData.length,
      0,
    );
    TestValidator.equals(
      "no records: second data is empty",
      secondData.length,
      0,
    );
    TestValidator.equals(
      "no records: current is 0 in first page",
      firstPagination.current,
      0,
    );
    TestValidator.equals(
      "no records: current is 0 in second page",
      secondPagination.current,
      0,
    );
    TestValidator.equals(
      "no records: records is 0",
      firstPagination.records,
      0,
    );
  } else {
    // There is at least one audit record in total
    TestValidator.predicate(
      "first page has between 1 and limit items when pages>0",
      firstData.length >= 1 && firstData.length <= limit,
    );

    TestValidator.equals(
      "beyond last page returns empty data",
      secondData.length,
      0,
    );
  }
}
