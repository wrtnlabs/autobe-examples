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

/**
 * Verify access control for login attempt detail retrieval.
 *
 * Business purpose: Ensure that the sensitive audit trail of authentication
 * attempts is only readable by admin users. Unauthenticated callers and regular
 * member users must not be able to retrieve individual login attempt details.
 *
 * Scenario steps:
 *
 * 1. Register a member account and execute a few login attempts so that
 *    todo_app_login_attempts contains at least one record involving this
 *    member.
 * 2. Register an admin account and log in as that admin so that admin-related
 *    login attempts also exist and to obtain a valid Authorization header for
 *    subsequent admin-only calls.
 * 3. As the admin user, search login attempts via PATCH
 *    /todoApp/adminUser/loginAttempts with filters that match at least one
 *    recent record and pick one loginAttemptId from the result.
 * 4. Call GET /todoApp/adminUser/loginAttempts/{loginAttemptId} using a connection
 *    without Authorization headers and ensure it throws an error
 *    (authentication/authorization failure).
 * 5. Log in as the member user, then call the same GET endpoint with the member
 *    token and ensure it also throws an error (member is not allowed to read
 *    login attempts).
 * 6. Log back in as the admin user and call GET
 *    /todoApp/adminUser/loginAttempts/{loginAttemptId} again, asserting that it
 *    succeeds and returns a valid ITodoAppLoginAttempt whose id matches the
 *    selected loginAttemptId.
 */
export async function test_api_admin_login_attempt_detail_access_control(
  connection: api.IConnection,
) {
  // 1. Register a member user.
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/member/join",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Perform multiple member login attempts (both success and failure) to
  // ensure login attempts are recorded.
  const memberLoginBase = {
    email: memberEmail,
    ip: null,
    href: "https://todo-app.example.com/member/login",
    referrer: "https://todo-app.example.com/landing",
  } satisfies Omit<ITodoAppMemberUserLogin.IRequest, "password">;

  // 2-1. Failed login attempt: wrong password.
  const wrongPasswordLoginBody = {
    ...memberLoginBase,
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  await TestValidator.error(
    "member login with wrong password should fail",
    async () => {
      await api.functional.auth.memberUser.login(connection, {
        body: wrongPasswordLoginBody,
      });
    },
  );

  // 2-2. Successful login attempt with correct password.
  const correctPasswordLoginBody = {
    ...memberLoginBase,
    password: memberPassword,
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const memberLoginResult: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: correctPasswordLoginBody,
    });
  typia.assert(memberLoginResult);

  // 3. Register an admin user.
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

  const adminJoinResult: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinResult);

  // 4. Log in as the admin user to ensure we have a fresh admin session and
  // that admin login attempts are also recorded.
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://todo-app.example.com/admin/login",
    referrer: "https://todo-app.example.com/admin",
    user_agent: "e2e-test-agent",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLoginResult: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 5. As admin, search login attempts to obtain a valid loginAttemptId.
  // Prefer to search by the member's login_identifier so we know exactly
  // which attempt we are going to inspect.
  const searchBody = {
    page: 1,
    limit: 10,
    login_identifier: memberEmail,
    actor_type: "memberUser",
    succeeded: undefined,
    ip: undefined,
    failure_reason: undefined,
    created_from: null,
    created_to: null,
  } satisfies ITodoAppLoginAttempt.IRequest;

  const pageResult: IPageITodoAppLoginAttempt.ISummary =
    await api.functional.todoApp.adminUser.loginAttempts.index(connection, {
      body: searchBody,
    });
  typia.assert(pageResult);

  // Ensure there's at least one login attempt returned; if not, the test
  // setup would not have created any relevant records.
  TestValidator.predicate(
    "login attempts search should return at least one record for member",
    pageResult.data.length > 0,
  );

  const pickedSummary: ITodoAppLoginAttempt.ISummary = pageResult.data[0];
  const targetLoginAttemptId = pickedSummary.id;

  // 6. Call detail endpoint without any Authorization header and expect an
  // error.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated caller must not access login attempt detail",
    async () => {
      await api.functional.todoApp.adminUser.loginAttempts.at(
        unauthenticatedConnection,
        {
          loginAttemptId: targetLoginAttemptId,
        },
      );
    },
  );

  // 7. Log in as the member user and ensure member cannot read login attempt
  // details.
  const memberReLoginBody = {
    ...memberLoginBase,
    password: memberPassword,
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const memberReLoginResult: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberReLoginBody,
    });
  typia.assert(memberReLoginResult);

  await TestValidator.error(
    "member user must not access login attempt detail",
    async () => {
      await api.functional.todoApp.adminUser.loginAttempts.at(connection, {
        loginAttemptId: targetLoginAttemptId,
      });
    },
  );

  // 8. Log back in as admin to restore admin Authorization.
  const adminReLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://todo-app.example.com/admin/login",
    referrer: "https://todo-app.example.com/admin",
    user_agent: "e2e-test-agent",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminReLoginResult: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminReLoginBody,
    });
  typia.assert(adminReLoginResult);

  // 9. As admin, successfully retrieve the login attempt detail and validate
  // its consistency.
  const detail: ITodoAppLoginAttempt =
    await api.functional.todoApp.adminUser.loginAttempts.at(connection, {
      loginAttemptId: targetLoginAttemptId,
    });
  typia.assert(detail);

  TestValidator.equals(
    "loginAttempt detail id should match requested id",
    detail.id,
    targetLoginAttemptId,
  );

  // Basic consistency check: login_identifier and actor_type in the detail
  // should match the summary we picked.
  TestValidator.equals(
    "loginAttempt detail login_identifier should match summary",
    detail.login_identifier,
    pickedSummary.login_identifier,
  );

  TestValidator.equals(
    "loginAttempt detail actor_type should match summary",
    detail.actor_type,
    pickedSummary.actor_type,
  );
}
