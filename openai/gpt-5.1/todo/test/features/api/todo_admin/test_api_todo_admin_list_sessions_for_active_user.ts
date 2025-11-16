import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodouserSession";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";

/**
 * E2E: todoAdmin lists authentication sessions for an active todoUser.
 *
 * Business purpose:
 *
 * - Ensure that the administrative session listing endpoint PATCH
 *   /todoApp/todoAdmin/todoUsers/{todoUserId}/sessions correctly returns
 *   paginated session summaries only for the specified todo user, and that it
 *   is accessible only with todoAdmin credentials.
 *
 * Test steps:
 *
 * 1. Register an admin account (POST /auth/todoAdmin/join).
 *
 *    - Use deterministic, valid email, password, href, referrer.
 *    - Typia.assert the ITodoAppTodoAdmin.IAuthorized response.
 *    - This call sets an admin JWT into `connection.headers`.
 * 2. Register a todoUser account (POST /auth/todoUser/join).
 *
 *    - Provide ITodoAppTodoUserJoin.IRequest with email, password, display_name
 *         (optional), and realistic href/referrer.
 *    - Typia.assert the ITodoAppTodoUser.IAuthorized response.
 *    - Capture the todoUser id and email for later assertions.
 *    - This call also creates an initial session row for the user and sets the
 *         connection Authorization header to the todoUser token.
 * 3. Perform multiple logins as the same todoUser (POST /auth/todoUser/login).
 *
 *    - Call login 2~3 times with the same email/password and different href/referrer
 *         to simulate realistic activity.
 *    - Each successful login should create a new todo_app_todouser_sessions record.
 *    - After each login, typia.assert the ITodoAppTodoUser.IAuthorized response.
 *    - Track how many login attempts succeeded (for basic expectations that total
 *         session records should be at least that many plus the registration
 *         session).
 * 4. Re-authenticate as an admin.
 *
 *    - Easiest approach: call /auth/todoAdmin/join again with a different admin
 *         email.
 *    - Typia.assert the ITodoAppTodoAdmin.IAuthorized response.
 *    - This overwrites `connection.headers.Authorization` with an admin token so
 *         subsequent calls execute in admin context.
 * 5. Call PATCH /todoApp/todoAdmin/todoUsers/{todoUserId}/sessions via
 *    api.functional.todoApp.todoAdmin.todoUsers.sessions.index.
 *
 *    - Pass todoUserId from the created todoUser.
 *    - For the body, construct ITodoAppTodouserSession.IRequest with: page = 1
 *         (first page, 1-based), limit = 2 (small page size to exercise
 *         pagination), other filters omitted (undefined) so we get a simple
 *         listing of most recent sessions.
 *    - Await the response of type IPageITodoAppTodouserSession.ISummary and validate
 *         with typia.assert.
 * 6. Validate pagination metadata and general structure.
 *
 *    - Pagination.current must be 0 for the first page.
 *    - Pagination.limit should equal 2 (the requested limit).
 *    - Pagination.records must be >= data.length.
 *    - Pagination.pages must be >= 1 when records > 0.
 *    - Data.length should be > 0 (because we created multiple sessions) and <=
 *         limit.
 * 7. Validate each ITodoAppTodouserSession.ISummary item.
 *
 *    - TodoUser.id equals the created user's id.
 *    - TodoUser.email equals the created user's email.
 *    - Ip, href, referrer are non-empty strings.
 *    - Created_at is a non-empty string.
 *    - Expired_at can be null/undefined or a date-time string, but typia.assert
 *         already guarantees the type, so only business checks on presence are
 *         performed where reasonable.
 * 8. Optionally request a second page of sessions.
 *
 *    - Call the same index endpoint with page = 2 and the same limit.
 *    - Validate that pagination.current is 1, limit still equals 2, and data.length
 *         is between 0 and 2.
 *    - For all returned records, again confirm that todoUser.id and email match the
 *         created todoUser.
 * 9. Error scenarios (kept simple and business-level):
 *
 *    - We skip explicit unauthorized error tests because the E2E template and SDK
 *         already assume valid authorization; focusing here on the happy path
 *         and data-scoping guarantees.
 */
export async function test_api_todo_admin_list_sessions_for_active_user(
  connection: api.IConnection,
) {
  // 1. Register an initial admin to ensure admin capabilities exist.
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPass123!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const initialAdmin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(initialAdmin);

  // 2. Register a todoUser account who will own the sessions.
  const userEmail = `user+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const userPassword = "UserPass123!";

  const userJoinBody = {
    email: userEmail as string & tags.Format<"email">,
    password: userPassword as string & tags.Format<"password">,
    display_name: RandomGenerator.name(2),
    ip: "192.168.0.10",
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/marketing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const joinedUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(joinedUser);

  const todoUserId = joinedUser.id;
  const todoUserEmail = joinedUser.email;

  // 3. Perform multiple logins as the same todoUser to create extra sessions.
  const loginAttempts = 3;
  for (let i = 0; i < loginAttempts; i += 1) {
    const loginBody = {
      email: todoUserEmail,
      password: userPassword,
      ip: `192.168.0.${20 + i}`,
      href: `https://app.example.com/login?try=${i + 1}`,
      referrer: "https://app.example.com/home",
    } satisfies ITodoAppTodoUserLogin.IRequest;

    const loggedInUser: ITodoAppTodoUser.IAuthorized =
      await api.functional.auth.todoUser.login(connection, {
        body: loginBody,
      });
    typia.assert(loggedInUser);

    TestValidator.equals(
      `logged-in user id matches joined user id on attempt ${i + 1}`,
      loggedInUser.id,
      todoUserId,
    );
  }

  // 4. Re-authenticate as an admin so that the listing endpoint executes
  // in admin context. Use a new admin account to avoid any coupling
  // with the initial admin join call.
  const secondAdminJoinBody = {
    email: `admin2+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPass456!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.2",
    href: "https://admin.example.com/register2",
    referrer: "https://admin.example.com/landing2",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const secondAdmin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: secondAdminJoinBody,
    });
  typia.assert(secondAdmin);

  // 5. Call the admin sessions listing endpoint for page 1.
  const requestPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ITodoAppTodouserSession.IRequest;

  const page1: IPageITodoAppTodouserSession.ISummary =
    await api.functional.todoApp.todoAdmin.todoUsers.sessions.index(
      connection,
      {
        todoUserId,
        body: requestPage1,
      },
    );
  typia.assert(page1);

  const pagination1 = page1.pagination;
  const data1 = page1.data;

  // 6. Pagination metadata assertions for first page.
  TestValidator.equals(
    "first page current index should be 0 (0-based)",
    pagination1.current,
    0,
  );

  TestValidator.equals(
    "page1 limit equals requested limit",
    pagination1.limit,
    requestPage1.limit,
  );

  TestValidator.predicate(
    "records count must be >= number of returned items on page1",
    pagination1.records >= data1.length,
  );

  TestValidator.predicate(
    "pages must be >= 1 when any records exist",
    pagination1.records === 0 || pagination1.pages >= 1,
  );

  TestValidator.predicate(
    "page1 data length must be > 0 and <= limit (we created several sessions)",
    data1.length > 0 && data1.length <= pagination1.limit,
  );

  // 7. Validate each session summary item in page1.
  for (const [index, session] of data1.entries()) {
    typia.assert<ITodoAppTodouserSession.ISummary>(session);

    TestValidator.equals(
      `session[${index}] todoUser.id matches target user id`,
      session.todoUser.id,
      todoUserId,
    );

    TestValidator.equals(
      `session[${index}] todoUser.email matches target user email`,
      session.todoUser.email,
      todoUserEmail,
    );

    TestValidator.predicate(
      `session[${index}] ip is a non-empty string`,
      session.ip.length > 0,
    );

    TestValidator.predicate(
      `session[${index}] href is a non-empty string`,
      session.href.length > 0,
    );

    TestValidator.predicate(
      `session[${index}] referrer is a non-empty string`,
      session.referrer.length > 0,
    );

    TestValidator.predicate(
      `session[${index}] created_at is a non-empty string`,
      session.created_at.length > 0,
    );
  }

  // 8. Optionally fetch the second page to validate pagination further.
  const requestPage2 = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: requestPage1.limit,
  } satisfies ITodoAppTodouserSession.IRequest;

  const page2: IPageITodoAppTodouserSession.ISummary =
    await api.functional.todoApp.todoAdmin.todoUsers.sessions.index(
      connection,
      {
        todoUserId,
        body: requestPage2,
      },
    );
  typia.assert(page2);

  const pagination2 = page2.pagination;
  const data2 = page2.data;

  TestValidator.equals(
    "second page current index should be 1 (0-based)",
    pagination2.current,
    1,
  );

  TestValidator.equals(
    "page2 limit equals requested limit",
    pagination2.limit,
    requestPage2.limit,
  );

  TestValidator.predicate(
    "page2 data length must be between 0 and limit",
    data2.length >= 0 && data2.length <= pagination2.limit,
  );

  for (const [index, session] of data2.entries()) {
    typia.assert<ITodoAppTodouserSession.ISummary>(session);

    TestValidator.equals(
      `page2 session[${index}] todoUser.id matches target user id`,
      session.todoUser.id,
      todoUserId,
    );

    TestValidator.equals(
      `page2 session[${index}] todoUser.email matches target user email`,
      session.todoUser.email,
      todoUserEmail,
    );
  }
}
