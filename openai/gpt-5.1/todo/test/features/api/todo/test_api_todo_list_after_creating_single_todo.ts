import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate that listing todos after creating one returns the created todo in
 * the member user's paginated summary list.
 *
 * Business flow:
 *
 * 1. Bootstrap an admin user and configure a basic system setting to enable todo
 *    usage.
 * 2. Register and log in a member user who will own todos.
 * 3. As the member, create a single todo with a known title/state/due_date.
 * 4. List todos with broad filters (page 0, limit 10, no search/state filters).
 * 5. Assert pagination is consistent and that the created todo appears exactly
 *    once in the summary list with matching core fields.
 */
export async function test_api_todo_list_after_creating_single_todo(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap: join admin user
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> =
    "AdminPass123!" as string & tags.Format<"password">;

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(2),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.test/join",
    referrer: "https://admin.todoapp.test/",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Optional: admin login to ensure token handling path also works
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://admin.todoapp.test/login",
    referrer: "https://admin.todoapp.test/",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Admin system setting to enable todos (semantic only, not strictly asserted)
  const systemSettingBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description:
      "Maximum number of active todos allowed per member user in tests.",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  // 3. Member bootstrap: join member user
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string & tags.Format<"password"> =
    "MemberPass123!" as string & tags.Format<"password">;

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://todoapp.test/signup",
    referrer: "https://todoapp.test/",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Optional: explicit member login to exercise login path
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://todoapp.test/login",
    referrer: "https://todoapp.test/",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 4. Create a single todo as the member user
  const todoTitle: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const todoDescription: string = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 10,
  });
  const todoDueDate: string & tags.Format<"date-time"> = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const todoCreateBody = {
    title: todoTitle,
    description: todoDescription,
    due_date: todoDueDate,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // 5. List todos with broad filters
  const listRequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    search: null,
    state: null,
    createdFrom: null,
    createdTo: null,
    dueFrom: null,
    dueTo: null,
    completed: null,
  } satisfies ITodoAppTodo.IRequest;

  const page: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.memberUser.todos.index(connection, {
      body: listRequestBody,
    });
  typia.assert(page);

  // 6. Pagination assertions
  TestValidator.equals(
    "pagination current page should be 0",
    page.pagination.current,
    0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    page.pagination.limit > 0,
  );
  TestValidator.predicate(
    "there should be at least one todo record",
    page.pagination.records >= 1 && page.data.length >= 1,
  );

  // 7. Find the created todo in summary list
  const matchedSummaries = page.data.filter(
    (summary) => summary.id === createdTodo.id,
  );
  TestValidator.equals(
    "created todo should appear exactly once in list",
    matchedSummaries.length,
    1,
  );

  const summary = matchedSummaries[0];
  typia.assert(summary);

  // 8. Field-level assertions between created todo and summary
  TestValidator.equals(
    "summary id matches created todo id",
    summary.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "summary title matches created todo title",
    summary.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "summary state matches created todo state",
    summary.state,
    createdTodo.state,
  );
  TestValidator.equals(
    "summary due_date matches created todo due_date",
    summary.due_date ?? null,
    createdTodo.due_date ?? null,
  );
  TestValidator.equals(
    "summary created_at matches created todo created_at",
    summary.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "summary updated_at matches created todo updated_at",
    summary.updated_at,
    createdTodo.updated_at,
  );
  TestValidator.equals(
    "summary completed_at matches created todo completed_at",
    summary.completed_at ?? null,
    createdTodo.completed_at ?? null,
  );
}
