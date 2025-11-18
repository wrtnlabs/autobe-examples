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

export async function test_api_admin_member_user_search_by_email_filter(
  connection: api.IConnection,
) {
  // 1. Prepare an admin user and authenticate
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorizedFromJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Create two member users with controlled email patterns
  const baseMemberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const atIndex = baseMemberEmail.indexOf("@");
  const filterSubstring: string =
    atIndex > 1 ? baseMemberEmail.substring(0, atIndex) : baseMemberEmail;

  const matchingMemberEmail: string & tags.Format<"email"> = baseMemberEmail;

  const commonMemberPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  // 2-1. Join matching member
  const matchingMemberJoinBody = {
    email: matchingMemberEmail,
    password: commonMemberPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const matchingMemberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: matchingMemberJoinBody,
    });
  typia.assert(matchingMemberAuthorized);

  // 2-2. Create a todo for matching member to simulate activity
  const matchingTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const matchingTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: matchingTodoBody,
    });
  typia.assert(matchingTodo);

  // 2-3. Join non-matching member with an email that does NOT contain the substring
  let nonMatchingMemberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  // Ensure the non-matching email truly does not contain the filter substring
  while (nonMatchingMemberEmail.includes(filterSubstring)) {
    nonMatchingMemberEmail = typia.random<string & tags.Format<"email">>();
  }

  const nonMatchingMemberJoinBody = {
    email: nonMatchingMemberEmail,
    password: commonMemberPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const nonMatchingMemberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: nonMatchingMemberJoinBody,
    });
  typia.assert(nonMatchingMemberAuthorized);

  // 2-4. Create a todo for non-matching member
  const nonMatchingTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoAppTodo.ICreate;

  const nonMatchingTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: nonMatchingTodoBody,
    });
  typia.assert(nonMatchingTodo);

  // 3. Re-authenticate as admin to perform member search
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    user_agent: null,
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAuthorizedFromLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 4. Execute the memberUsers.index search with email substring filter
  const searchRequestBody = {
    page: 1,
    limit: 10,
    email: filterSubstring,
  } satisfies ITodoAppMemberuser.IRequest;

  const page: IPageITodoAppMemberuser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: searchRequestBody,
    });
  typia.assert(page);

  // 5. Validate pagination metadata
  const pagination = page.pagination;
  TestValidator.predicate(
    "pagination current page should be 1",
    () => pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be >= data length",
    () => pagination.limit >= page.data.length,
  );
  TestValidator.predicate(
    "pagination records should equal data length",
    () => pagination.records === page.data.length,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1 when records > 0",
    () =>
      pagination.records === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );

  // 6. Validate filter correctness: all returned emails contain the substring
  for (const summary of page.data) {
    TestValidator.predicate(
      "returned member email should contain filter substring",
      () => summary.email.includes(filterSubstring),
    );
  }

  // 7. Ensure that the matching member is included and non-matching is excluded
  const hasMatching = page.data.some(
    (summary) => summary.email === matchingMemberEmail,
  );
  const hasNonMatching = page.data.some(
    (summary) => summary.email === nonMatchingMemberEmail,
  );

  TestValidator.predicate(
    "search result must include matching member email",
    hasMatching,
  );
  TestValidator.predicate(
    "search result must not include non-matching member email",
    !hasNonMatching,
  );
}
