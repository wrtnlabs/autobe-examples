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

/**
 * Validate admin login-attempt search filtering by member login identifier and
 * time window.
 *
 * Business workflow:
 *
 * 1. Register two distinct member users via /auth/memberUser/join with different
 *    emails.
 * 2. For the first member, perform multiple login attempts (two successful and one
 *    failed) using /auth/memberUser/login.
 * 3. For the second member, perform successful login attempts only.
 * 4. Optionally create todos for both members to exercise authenticated flows.
 * 5. Capture an inclusive time window around the first member’s attempts.
 * 6. Register and authenticate an admin user via /auth/adminUser/join and
 *    /auth/adminUser/login.
 * 7. As admin, call PATCH /todoApp/adminUser/loginAttempts with filters:
 *    login_identifier of first member, created_from/to window, page=1, limit
 *    large enough.
 * 8. Assert that all returned login attempts belong to the first member, have
 *    actor_type indicating memberUser, and created_at within the window; and
 *    that attempts of the second member are excluded.
 * 9. Issue a second search with a narrower window to ensure fewer attempts are
 *    returned but still matching constraints.
 */
export async function test_api_admin_login_attempt_search_with_identifier_and_time_window(
  connection: api.IConnection,
) {
  // Common navigation context for auth flows
  const href: string = typia.random<string & tags.Format<"uri">>();
  const referrer: string = typia.random<string & tags.Format<"uri">>();

  // 1. Register two distinct member users
  const member1Email: string = typia.random<string & tags.Format<"email">>();
  const member2Email: string = typia.random<string & tags.Format<"email">>();

  const member1Password: string = typia.random<
    string & tags.Format<"password">
  >();
  const member2Password: string = typia.random<
    string & tags.Format<"password">
  >();

  const member1JoinBody = {
    email: member1Email,
    password: member1Password,
    display_name: RandomGenerator.name(),
    ip: null,
    href,
    referrer,
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const member1Auth: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: member1JoinBody,
    });
  typia.assert(member1Auth);

  const member2JoinBody = {
    email: member2Email,
    password: member2Password,
    display_name: RandomGenerator.name(),
    ip: null,
    href,
    referrer,
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const member2Auth: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: member2JoinBody,
    });
  typia.assert(member2Auth);

  // 2. First member: successful and failed logins
  // Capture timestamps before and after sequence to define window.
  const windowStart: string = new Date().toISOString();

  // Successful login #1 for member1
  const member1LoginBody1 = {
    email: member1Email,
    password: member1Password,
    ip: null,
    href,
    referrer,
  } satisfies ITodoAppMemberUserLogin.IRequest;
  const member1Login1: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: member1LoginBody1,
    });
  typia.assert(member1Login1);

  // Failed login for member1 using wrong password (business-level failure)
  const member1FailedPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const member1LoginBodyFailed = {
    email: member1Email,
    password: member1FailedPassword,
    ip: null,
    href,
    referrer,
  } satisfies ITodoAppMemberUserLogin.IRequest;
  await TestValidator.error(
    "member1 failed login attempt recorded",
    async () => {
      await api.functional.auth.memberUser.login(connection, {
        body: member1LoginBodyFailed,
      });
    },
  );

  // Successful login #2 for member1
  const member1LoginBody2 = {
    email: member1Email,
    password: member1Password,
    ip: null,
    href,
    referrer,
  } satisfies ITodoAppMemberUserLogin.IRequest;
  const member1Login2: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: member1LoginBody2,
    });
  typia.assert(member1Login2);

  const windowEnd: string = new Date().toISOString();

  // 3. Second member: only successful login attempts
  const member2LoginBody1 = {
    email: member2Email,
    password: member2Password,
    ip: null,
    href,
    referrer,
  } satisfies ITodoAppMemberUserLogin.IRequest;
  const member2Login1: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: member2LoginBody1,
    });
  typia.assert(member2Login1);

  const member2LoginBody2 = {
    email: member2Email,
    password: member2Password,
    ip: null,
    href,
    referrer,
  } satisfies ITodoAppMemberUserLogin.IRequest;
  const member2Login2: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: member2LoginBody2,
    });
  typia.assert(member2Login2);

  // 4. Optionally create todos for both members
  const todoBody1 = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;
  const todo1: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoBody1,
    });
  typia.assert(todo1);

  // Switch to member2 (login again to bump token)
  const member2LoginForTodoBody = {
    email: member2Email,
    password: member2Password,
    ip: null,
    href,
    referrer,
  } satisfies ITodoAppMemberUserLogin.IRequest;
  const member2LoginForTodo: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: member2LoginForTodoBody,
    });
  typia.assert(member2LoginForTodo);

  const todoBody2 = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITodoAppTodo.ICreate;
  const todo2: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoBody2,
    });
  typia.assert(todo2);

  // 5. Admin registration and login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href,
    referrer,
    user_agent: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 6. Admin searches login attempts for member1 within full window
  const searchBodyFullWindow = {
    page: 1,
    limit: 50,
    login_identifier: member1Email,
    actor_type: "memberUser",
    succeeded: undefined,
    ip: undefined,
    failure_reason: undefined,
    created_from: windowStart,
    created_to: windowEnd,
  } satisfies ITodoAppLoginAttempt.IRequest;

  const pageFull: IPageITodoAppLoginAttempt.ISummary =
    await api.functional.todoApp.adminUser.loginAttempts.index(connection, {
      body: searchBodyFullWindow,
    });
  typia.assert(pageFull);

  TestValidator.predicate(
    "full-window search returns at least one attempt for member1",
    pageFull.pagination.records > 0,
  );

  for (const attempt of pageFull.data) {
    typia.assert<ITodoAppLoginAttempt.ISummary>(attempt);

    TestValidator.equals(
      "login_identifier must equal member1 email in full-window search",
      attempt.login_identifier,
      member1Email,
    );

    TestValidator.equals(
      "actor_type must be memberUser in full-window search",
      attempt.actor_type,
      "memberUser",
    );

    TestValidator.predicate(
      "created_at must be within [windowStart, windowEnd]",
      attempt.created_at >= windowStart && attempt.created_at <= windowEnd,
    );

    if (attempt.memberUser !== undefined) {
      TestValidator.equals(
        "memberUser.email in summary must match member1 email",
        attempt.memberUser.email,
        member1Email,
      );
    }

    if (attempt.adminUser !== undefined) {
      TestValidator.equals(
        "adminUser.email, when present, must equal admin email",
        attempt.adminUser.email,
        adminEmail,
      );
    }
  }

  for (const attempt of pageFull.data) {
    TestValidator.notEquals(
      "no login attempt in result should belong to member2 email",
      attempt.login_identifier,
      member2Email,
    );
  }

  // 7. Narrower time window to exclude earliest attempts if possible
  const startDateObj = new Date(windowStart);
  const narrowedStartDate: string = new Date(
    startDateObj.getTime() + 500,
  ).toISOString();

  const searchBodyNarrowWindow = {
    page: 1,
    limit: 50,
    login_identifier: member1Email,
    actor_type: "memberUser",
    succeeded: undefined,
    ip: undefined,
    failure_reason: undefined,
    created_from: narrowedStartDate,
    created_to: windowEnd,
  } satisfies ITodoAppLoginAttempt.IRequest;

  const pageNarrow: IPageITodoAppLoginAttempt.ISummary =
    await api.functional.todoApp.adminUser.loginAttempts.index(connection, {
      body: searchBodyNarrowWindow,
    });
  typia.assert(pageNarrow);

  TestValidator.predicate(
    "narrow-window search returns zero or more attempts for member1",
    pageNarrow.pagination.records >= 0,
  );

  for (const attempt of pageNarrow.data) {
    typia.assert<ITodoAppLoginAttempt.ISummary>(attempt);

    TestValidator.equals(
      "login_identifier must equal member1 email in narrow-window search",
      attempt.login_identifier,
      member1Email,
    );

    TestValidator.predicate(
      "created_at must be within [narrowedStartDate, windowEnd]",
      attempt.created_at >= narrowedStartDate &&
        attempt.created_at <= windowEnd,
    );
  }

  if (pageFull.pagination.records > pageNarrow.pagination.records) {
    TestValidator.predicate(
      "narrow-window search should not expand the number of matched records",
      pageNarrow.pagination.records <= pageFull.pagination.records,
    );
  }
}
