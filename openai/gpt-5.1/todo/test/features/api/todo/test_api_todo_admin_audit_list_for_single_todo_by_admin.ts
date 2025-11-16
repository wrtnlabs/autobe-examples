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
 * Validate that a todoAdmin can list administrative audit records for a single
 * todo.
 *
 * Business context:
 *
 * - TodoAdmin is a privileged actor who can inspect administrative audit trails
 *   for individual todos using the PATCH
 *   /todoApp/todoAdmin/todos/{todoId}/adminAudits endpoint.
 * - A todoUser owns todos and triggers business activity, but is not allowed to
 *   read admin audits directly.
 * - The audit list is paginated and returns lightweight summary DTOs
 *   (ITodoAppTodoAdminAudit.ISummary) wrapped in
 *   IPageITodoAppTodoAdminAudit.ISummary.
 *
 * This E2E test executes a realistic multi-actor flow to reach the listing call
 * and then validates the shape and scoping of the response.
 *
 * High-level steps:
 *
 * 1. Register a new todoAdmin using /auth/todoAdmin/join. The SDK attaches the
 *    admin JWT token to the connection automatically.
 * 2. As todoAdmin, create a Todo status using POST /todoApp/todoAdmin/todoStatuses
 *    with ITodoAppTodoStatus.ICreate, so there is at least one valid status for
 *    todos.
 * 3. Register a new todoUser using /auth/todoUser/join and rely on SDK to set the
 *    todoUser token on the connection.
 * 4. As todoUser, create a new todo via POST /todoApp/todoUser/todos with
 *    ITodoAppTodo.ICreate and capture its id as todoId.
 * 5. Switch the authentication context back to todoAdmin using
 *    /auth/todoAdmin/login so that the subsequent adminAudits.index call is
 *    performed as an administrative actor.
 * 6. Call api.functional.todoApp.todoAdmin.todos.adminAudits.index with todoId and
 *    a request body (ITodoAppTodoAdminAudit.IRequest) specifying page=1 and
 *    limit=10 and no additional filters.
 * 7. Validate the response type with
 *    typia.assert<IPageITodoAppTodoAdminAudit.ISummary>(output).
 * 8. Assert that pagination.current and pagination.limit obey the documented
 *    non-negative and positive invariants, and that limit is greater than
 *    zero.
 * 9. If the page contains any audit entries (data.length > 0), perform additional
 *    business validations on the first entry and on all entries:
 *
 *    - Each audit.todo.id must equal the todoId we queried, confirming that the
 *         result set is scoped to a single todo.
 *    - Basic structural sanity: action is a non-empty string, created_at is present,
 *         and embedded todo and admin summaries are populated.
 *
 * Note:
 *
 * - We cannot force specific admin audit rows to exist using available APIs, so
 *   the test must be tolerant to the case where data is empty. In that case, we
 *   only check type-level and pagination invariants.
 * - We do not validate HTTP status codes or error branches, in accordance with
 *   the E2E framework rules.
 */
export async function test_api_todo_admin_audit_list_for_single_todo_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin and obtain authorized admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todoapp.test/join",
    referrer: "https://admin.todoapp.test/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminJoin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminJoin);

  // 2. Create at least one Todo status as the admin.
  const statusCreateBody = {
    code: `STATUS_${RandomGenerator.alphaNumeric(8)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: null,
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert<ITodoAppTodoStatus>(status);

  // 3. Register a new todoUser and obtain authorized todoUser context.
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://app.todoapp.test/join",
    referrer: "https://app.todoapp.test/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userJoin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(userJoin);

  // 4. As todoUser, create a new todo item.
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date().toISOString(),
    status_code: status.code,
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo = await api.functional.todoApp.todoUser.todos.create(
    connection,
    {
      body: todoCreateBody,
    },
  );
  typia.assert<ITodoAppTodo>(todo);

  // 5. Switch authentication back to todoAdmin using login
  const adminLoginBody = {
    email: adminJoin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.todoapp.test/login",
    referrer: "https://admin.todoapp.test/audits",
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminLogin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminLogin);

  // 6. Call adminAudits.index as todoAdmin for the created todo.
  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    action: null,
    field_name: null,
    admin_id: null,
    created_from: null,
    created_to: null,
  } satisfies ITodoAppTodoAdminAudit.IRequest;

  const page: IPageITodoAppTodoAdminAudit.ISummary =
    await api.functional.todoApp.todoAdmin.todos.adminAudits.index(connection, {
      todoId: todo.id,
      body: requestBody,
    });
  typia.assert<IPageITodoAppTodoAdminAudit.ISummary>(page);

  // 7. Basic pagination invariants.
  const pagination: IPage.IPagination = page.pagination;
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination.limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );

  // 8. If there are audit records, validate scoping and core fields.
  if (page.data.length > 0) {
    const first: ITodoAppTodoAdminAudit.ISummary = page.data[0];

    // Ensure the audit is for the requested todo.
    TestValidator.equals(
      "first audit todo.id matches requested todoId",
      first.todo.id,
      todo.id,
    );

    // Basic action field sanity.
    TestValidator.predicate(
      "first audit action is non-empty",
      first.action.length > 0,
    );

    // Ensure nested todo summary is populated with same id.
    TestValidator.equals(
      "first audit nested todo summary id matches",
      first.todo.id,
      todo.id,
    );
    TestValidator.predicate(
      "first audit nested todo title is non-empty",
      first.todo.title.length > 0,
    );

    // Admin summary basic sanity: email non-empty.
    TestValidator.predicate(
      "first audit admin email is non-empty",
      first.admin.email.length > 0,
    );

    // 9. All entries must be scoped to the same todoId.
    for (const audit of page.data) {
      TestValidator.equals(
        "each audit todo.id matches requested todoId",
        audit.todo.id,
        todo.id,
      );
    }
  }
}
