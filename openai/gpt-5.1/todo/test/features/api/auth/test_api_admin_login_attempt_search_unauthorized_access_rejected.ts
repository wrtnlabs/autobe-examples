import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppLoginAttempt";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppLoginAttempt";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_admin_login_attempt_search_unauthorized_access_rejected(
  connection: api.IConnection,
) {
  // 1. Register a member user
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.local/member/join",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Perform a member login to generate a login attempt
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://todo-app.local/member/login",
    referrer: "https://todo-app.local/home",
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const memberLoginAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 3. Create a todo as the member to validate normal member flow
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // Common search request payload (with simple pagination only)
  const requestedPage = 1;
  const requestedLimit = 10;
  const searchRequestBody = {
    page: requestedPage,
    limit: requestedLimit,
  } satisfies ITodoAppLoginAttempt.IRequest;

  // 4-a. Attempt to call admin loginAttempts without any Authorization header
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated caller cannot access admin loginAttempts",
    async () => {
      await api.functional.todoApp.adminUser.loginAttempts.index(
        unauthenticatedConnection,
        {
          body: searchRequestBody,
        },
      );
    },
  );

  // 4-b. Attempt to call admin loginAttempts with a memberUser token
  await TestValidator.error(
    "member user cannot access admin loginAttempts",
    async () => {
      await api.functional.todoApp.adminUser.loginAttempts.index(connection, {
        body: searchRequestBody,
      });
    },
  );

  // 5. Register an admin user
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 6. Perform an explicit admin login to ensure admin token is active
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://todo-app.local/admin/login",
    referrer: "https://todo-app.local/admin",
    user_agent: "e2e-agent/1.0",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLoginAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 7. Call admin loginAttempts with valid admin token and assert success
  const adminSearchRequestBody = {
    page: requestedPage,
    limit: requestedLimit,
  } satisfies ITodoAppLoginAttempt.IRequest;

  const page: IPageITodoAppLoginAttempt.ISummary =
    await api.functional.todoApp.adminUser.loginAttempts.index(connection, {
      body: adminSearchRequestBody,
    });
  typia.assert(page);

  // Normalize tagged numeric types to plain numbers for comparison
  const currentPageNumber = page.pagination.current satisfies number as number;
  const currentLimitNumber = page.pagination.limit satisfies number as number;

  TestValidator.equals(
    "pagination current page should equal requested page",
    currentPageNumber,
    requestedPage,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit",
    currentLimitNumber,
    requestedLimit,
  );

  // Validate that all returned records (if any) have consistent structure
  await ArrayUtil.asyncForEach(page.data, async (attempt, index) => {
    typia.assert<ITodoAppLoginAttempt.ISummary>(attempt);

    TestValidator.predicate(
      `actor_type must be a non-empty string at index ${index}`,
      attempt.actor_type.length > 0,
    );

    TestValidator.predicate(
      `created_at must be a non-empty string at index ${index}`,
      attempt.created_at.length > 0,
    );
  });
}
