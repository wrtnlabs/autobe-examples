import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Validates paginated, filterable listing of user authentication session
 * records.
 *
 * - Registers a new Todo List user (join API) with random data
 * - Simulates multiple authentication sessions by repeated logins with different
 *   connection metadata (ip, href, referrer)
 * - Queries user session history using PATCH
 *   /todoList/user/users/{userId}/sessions with various filters and pagination
 * - Asserts all session records belong to the current user
 * - Checks filtering (ip, href, referrer) and pagination correctness
 * - Ensures data visibility and security (cannot see sessions from others)
 * - Validates completeness of all fields in responses
 * - Does not test business or system validation errors
 * - Only valid, authenticated request flows are tested
 */
export async function test_api_user_session_audit_listing(
  connection: api.IConnection,
) {
  // Register a new user (join)
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href =
    "https://app.example.com/register?rand=" + RandomGenerator.alphaNumeric(6);
  const referrer =
    "https://www.google.com/search?q=todo+register&rand=" +
    RandomGenerator.alphaNumeric(4);
  const ip = typia.random<string & tags.Format<"ipv4">>();

  const registrationBody = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies ITodoListUser.ICreate;

  const auth: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: registrationBody,
    },
  );
  typia.assert(auth);

  // Create additional sessions for same user by repeat logins (different meta)
  const sessionCount = 4;
  const sessionMetas = ArrayUtil.repeat(sessionCount, (i) => {
    // Vary ip, href, referrer
    return {
      email,
      password,
      href:
        "https://app.example.com/app?tab=sessions&run=" +
        RandomGenerator.alphaNumeric(6),
      referrer:
        "https://ref.example.com/promo?x=" + RandomGenerator.alphaNumeric(3),
      ip:
        i % 2 === 0
          ? typia.random<string & tags.Format<"ipv4">>()
          : typia.random<string & tags.Format<"ipv6">>(),
    } satisfies ITodoListUser.ICreate;
  });

  for (const body of sessionMetas) {
    const sessionAuth = await api.functional.auth.user.join(connection, {
      body,
    });
    typia.assert(sessionAuth);
    TestValidator.equals(
      "join returns current user's id",
      sessionAuth.id,
      auth.id,
    );
    TestValidator.equals(
      "join returns current user's email",
      sessionAuth.email,
      email,
    );
  }

  // List all sessions for user with default paging (should be sessionCount + 1)
  const allSessionsPage: IPageITodoListUserSession =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: auth.id,
      body: {} satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(allSessionsPage);
  TestValidator.equals(
    "all sessions (n+1 records)",
    allSessionsPage.data.length,
    sessionCount + 1,
  );
  for (const sess of allSessionsPage.data) {
    typia.assert(sess);
    TestValidator.equals(
      "session owner is current user",
      sess.user.id,
      auth.id,
    );
    TestValidator.predicate(
      "session ip is non-empty",
      typeof sess.ip === "string" && sess.ip.length > 0,
    );
    TestValidator.predicate(
      "session href is non-empty",
      typeof sess.href === "string" && sess.href.length > 0,
    );
    TestValidator.predicate(
      "session referrer is non-empty",
      typeof sess.referrer === "string" && sess.referrer.length > 0,
    );
    TestValidator.predicate(
      "created_at date-time",
      typeof sess.created_at === "string" && sess.created_at.length > 0,
    );
  }

  // Check pagination: limit 2
  const paged: IPageITodoListUserSession =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: auth.id,
      body: { page: 1, limit: 2 } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(paged);
  TestValidator.equals("pagination limit respected", paged.data.length, 2);
  TestValidator.predicate(
    "pagination meta pages >1",
    paged.pagination.pages > 1,
  );

  // Filtering by ip
  const ipToFilter = allSessionsPage.data[1].ip;
  const byIp: IPageITodoListUserSession =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: auth.id,
      body: { ip: ipToFilter } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(byIp);
  for (const sess of byIp.data) {
    TestValidator.equals("filter ip matches", sess.ip, ipToFilter);
  }

  // Filtering by href
  const hrefToFilter = allSessionsPage.data[0].href;
  const byHref: IPageITodoListUserSession =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: auth.id,
      body: { href: hrefToFilter } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(byHref);
  for (const sess of byHref.data) {
    TestValidator.equals("filter href matches", sess.href, hrefToFilter);
  }

  // Filtering by referrer
  const refToFilter = allSessionsPage.data[0].referrer;
  const byRef: IPageITodoListUserSession =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: auth.id,
      body: { referrer: refToFilter } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(byRef);
  for (const sess of byRef.data) {
    TestValidator.equals("filter referrer matches", sess.referrer, refToFilter);
  }
}
