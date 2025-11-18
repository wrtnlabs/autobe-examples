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

export async function test_api_admin_login_attempt_search_by_ip_and_actor_type(
  connection: api.IConnection,
) {
  // Create distinct, deterministic IPs for two simulated client contexts.
  const ipA = "203.0.113.10";
  const ipB = "198.51.100.20";

  // Common href/referrer values for login/join requests.
  const href = "https://todo-app.example.com/login";
  const referrer = "https://todo-app.example.com/";

  // 1. Register a member user
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: ipA,
    href,
    referrer,
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuth: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  // 2. Register an admin user
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuth: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // Helper to perform a member login with controllable IP
  const performMemberLogin = async (ip: string): Promise<void> => {
    const loginBody = {
      email: memberJoinBody.email,
      password: memberJoinBody.password,
      ip,
      href,
      referrer,
    } satisfies ITodoAppMemberUserLogin.IRequest;

    const auth: ITodoAppMemberuser.IAuthorized =
      await api.functional.auth.memberUser.login(connection, {
        body: loginBody,
      });
    typia.assert(auth);
  };

  // Helper to perform an admin login with controllable IP
  const performAdminLogin = async (ip: string): Promise<void> => {
    const loginBody = {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
      ip,
      href,
      referrer,
      user_agent: "E2E-Test-Agent/1.0",
    } satisfies ITodoAppAdminUser.ILogin;

    const auth: ITodoAppAdminUser.IAuthorized =
      await api.functional.auth.adminUser.login(connection, {
        body: loginBody,
      });
    typia.assert(auth);
  };

  // 3. Generate login attempts from IP_A
  await performMemberLogin(ipA);
  await performMemberLogin(ipA);
  await performAdminLogin(ipA);

  // 4. Generate login attempts from IP_B
  await performMemberLogin(ipB);
  await performAdminLogin(ipB);

  // Ensure we end up authenticated as admin for the search call (IP_A context)
  await performAdminLogin(ipA);

  // 5. Admin searches login attempts filtered by IP_A and actor_type = "memberUser"
  const memberFilterBody = {
    page: 1,
    limit: 50,
    ip: ipA,
    actor_type: "memberUser",
  } satisfies ITodoAppLoginAttempt.IRequest;

  const memberAttemptsPage: IPageITodoAppLoginAttempt.ISummary =
    await api.functional.todoApp.adminUser.loginAttempts.index(connection, {
      body: memberFilterBody,
    });
  typia.assert(memberAttemptsPage);

  // Business assertions for memberUser attempts
  TestValidator.predicate(
    "memberUser loginAttempts search should return at least one record",
    memberAttemptsPage.data.length > 0,
  );

  for (const attempt of memberAttemptsPage.data) {
    typia.assert<ITodoAppLoginAttempt.ISummary>(attempt);
    TestValidator.equals(
      "all returned memberUser attempts should have matching ip",
      attempt.ip,
      ipA,
    );
    TestValidator.equals(
      "all returned attempts should be for actor_type memberUser",
      attempt.actor_type,
      "memberUser",
    );
  }

  // 6. Repeat search with actor_type = "adminUser" for IP_A
  const adminFilterBody = {
    page: 1,
    limit: 50,
    ip: ipA,
    actor_type: "adminUser",
  } satisfies ITodoAppLoginAttempt.IRequest;

  const adminAttemptsPage: IPageITodoAppLoginAttempt.ISummary =
    await api.functional.todoApp.adminUser.loginAttempts.index(connection, {
      body: adminFilterBody,
    });
  typia.assert(adminAttemptsPage);

  TestValidator.predicate(
    "adminUser loginAttempts search should return at least one record",
    adminAttemptsPage.data.length > 0,
  );

  for (const attempt of adminAttemptsPage.data) {
    typia.assert<ITodoAppLoginAttempt.ISummary>(attempt);
    TestValidator.equals(
      "all returned adminUser attempts should have matching ip",
      attempt.ip,
      ipA,
    );
    TestValidator.equals(
      "all returned attempts should be for actor_type adminUser",
      attempt.actor_type,
      "adminUser",
    );
  }
}
