import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberuser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_admin_member_user_search_sorting_and_direction(
  connection: api.IConnection,
) {
  // 1. Register an admin user and obtain an authenticated admin session
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminJoin);

  // 2. Create multiple member users with deterministic, sortable emails
  const baseLocal = RandomGenerator.alphabets(8);
  const domain = "example.com";

  const memberCount = 4;
  const memberEmails: string[] = [];
  const memberPasswords: string[] = [];

  for (let i = 0; i < memberCount; i++) {
    const email = `${baseLocal}+${String.fromCharCode(97 + i)}@${domain}`;
    const password: string = typia.random<string & tags.Format<"password">>();

    memberEmails.push(email);
    memberPasswords.push(password);

    const joinBody = {
      email,
      password,
      display_name: RandomGenerator.name(),
      ip: null,
      href: "https://todo-app.test/join",
      referrer: "https://todo-app.test/landing",
    } satisfies ITodoAppMemberUserJoin.IRequest;

    const memberJoin = await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
    typia.assert<ITodoAppMemberuser.IAuthorized>(memberJoin);
  }

  // 3. Exercise some member activity and then ensure we are back as admin
  const firstMemberLoginBody = {
    email: memberEmails[0],
    password: memberPasswords[0],
    ip: null,
    href: "https://todo-app.test/login",
    referrer: "https://todo-app.test",
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const memberLogin = await api.functional.auth.memberUser.login(connection, {
    body: firstMemberLoginBody,
  });
  typia.assert<ITodoAppMemberuser.IAuthorized>(memberLogin);

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const todo = await api.functional.todoApp.memberUser.todos.create(
    connection,
    {
      body: todoCreateBody,
    },
  );
  typia.assert<ITodoAppTodo>(todo);

  // Switch back to admin session to perform memberUsers search
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://todo-app.test/admin/login",
    referrer: "https://todo-app.test/admin",
    user_agent: "e2e-test-agent",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLogin = await api.functional.auth.adminUser.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminLogin);

  // 4. Call memberUsers.index with ascending order by email
  const ascRequestBody = {
    page: 1,
    limit: 50,
    orderBy: "email",
    orderDirection: "asc",
  } satisfies ITodoAppMemberuser.IRequest;

  const ascPage = await api.functional.todoApp.adminUser.memberUsers.index(
    connection,
    {
      body: ascRequestBody,
    },
  );
  typia.assert<IPageITodoAppMemberuser.ISummary>(ascPage);

  // Basic pagination sanity checks using predicates to avoid tag-generic issues
  TestValidator.predicate(
    "pagination current page should be 1",
    ascPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be >= number of records",
    ascPage.pagination.limit >= ascPage.pagination.records,
  );

  // Extract subset of summaries corresponding to our created member emails
  const ascSubset: ITodoAppMemberuser.ISummary[] = ascPage.data.filter(
    (summary) => memberEmails.includes(summary.email),
  );

  TestValidator.equals(
    "all created member users must appear in asc results",
    ascSubset.length,
    memberEmails.length,
  );

  // Verify the subset is sorted ascending by email
  const ascSorted = ascSubset
    .slice()
    .sort((a, b) => a.email.localeCompare(b.email));

  TestValidator.equals(
    "ascending subset should already be sorted by email",
    ascSubset,
    ascSorted,
  );

  // 5. Call memberUsers.index with descending order by email
  const descRequestBody = {
    page: 1,
    limit: 50,
    orderBy: "email",
    orderDirection: "desc",
  } satisfies ITodoAppMemberuser.IRequest;

  const descPage = await api.functional.todoApp.adminUser.memberUsers.index(
    connection,
    {
      body: descRequestBody,
    },
  );
  typia.assert<IPageITodoAppMemberuser.ISummary>(descPage);

  // Pagination sanity checks for desc as well
  TestValidator.predicate(
    "desc pagination current page should be 1",
    descPage.pagination.current === 1,
  );

  // Extract subset for our members in descending results
  const descSubset: ITodoAppMemberuser.ISummary[] = descPage.data.filter(
    (summary) => memberEmails.includes(summary.email),
  );

  TestValidator.equals(
    "desc subset must contain all created member users",
    descSubset.length,
    memberEmails.length,
  );

  // 6. Verify descending subset is the reverse order of ascending subset
  const ascEmails = ascSubset.map((s) => s.email);
  const descEmails = descSubset.map((s) => s.email);

  const reversedAscEmails = ascEmails.slice().reverse();

  TestValidator.equals(
    "descending emails should equal reversed ascending emails",
    descEmails,
    reversedAscEmails,
  );
}
