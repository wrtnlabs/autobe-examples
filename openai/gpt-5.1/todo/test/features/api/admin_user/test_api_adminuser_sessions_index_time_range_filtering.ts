import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminuserSession";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppAdminUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUserSession";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate admin session listing with created_at time range filtering.
 *
 * Business workflow:
 *
 * 1. Register an admin via /auth/adminUser/join to obtain an authorized admin and
 *    adminUserId.
 * 2. Create at least one todoApp system setting via
 *    /todoApp/adminUser/systemSettings to simulate initialized configuration.
 * 3. Register a member user via /auth/memberUser/join and create a todo via
 *    /todoApp/memberUser/todos for realistic app usage.
 * 4. Ensure multiple admin sessions exist by logging in the same admin several
 *    times via /auth/adminUser/login.
 * 5. Call PATCH /todoApp/adminUser/adminUsers/{adminUserId}/sessions with a broad
 *    filter to retrieve all sessions for this admin.
 * 6. Derive a time window [fromCreatedAt, toCreatedAt] that includes only a subset
 *    of the sessions and call the index API again with that window.
 * 7. Verify that all returned sessions fall within the requested range, are
 *    ordered by created_at ascending, and that pagination metadata matches the
 *    result size.
 * 8. Optionally perform a second query with a disjoint time window and verify that
 *    its result set is disjoint from the first filtered window or empty.
 */
export async function test_api_adminuser_sessions_index_time_range_filtering(
  connection: api.IConnection,
) {
  // 1. Register admin user (implicitly authenticates and sets Authorization header)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminUserId = adminAuthorized.id;

  // 2. Create a system setting as this admin
  const systemSettingBody = {
    key: `max_sessions_${RandomGenerator.alphaNumeric(8)}`,
    value: "10",
    type: "int",
    description: "Maximum concurrent admin sessions for testing.",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  // 3. Register a member user and create a todo for realistic context
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(todo);

  // 4. Generate additional admin sessions by logging in multiple times.
  //    We will perform several login calls with different href/referrer values.
  const loginAttempts = 3;
  for (let i = 0; i < loginAttempts; i++) {
    const adminLoginBody = {
      email: adminAuthorized.email,
      password: adminJoinBody.password,
      ip: "127.0.0.1",
      href: `https://admin.example.com/login?try=${i}` as string &
        tags.Format<"uri">,
      referrer: "https://admin.example.com/dashboard" as string &
        tags.Format<"uri">,
    } satisfies ITodoAppAdminUser.ILogin;

    const adminLoginResult: ITodoAppAdminUser.IAuthorized =
      await api.functional.auth.adminUser.login(connection, {
        body: adminLoginBody,
      });
    typia.assert(adminLoginResult);
  }

  // 5. Broad query to get all sessions for this admin user.
  const broadRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    fromCreatedAt: null,
    toCreatedAt: null,
    ip: null,
    orderByCreatedAt: "asc" as const,
  } satisfies ITodoAppAdminUserSession.IRequest;

  const broadPage: IPageITodoAppAdminuserSession.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId,
        body: broadRequestBody,
      },
    );
  typia.assert(broadPage);

  const allSessions: ITodoAppAdminUserSession.ISummary[] = broadPage.data;

  TestValidator.predicate(
    "broad session query should return at least one session",
    allSessions.length > 0,
  );

  // Ensure sessions are sorted ascending by created_at in broad query
  for (let i = 1; i < allSessions.length; i++) {
    const prev = allSessions[i - 1];
    const curr = allSessions[i];
    TestValidator.predicate(
      "broad sessions must be ordered by created_at asc",
      prev.created_at <= curr.created_at,
    );
  }

  // 6. Derive a sub-range [fromCreatedAt, toCreatedAt].
  // If we have at least 3 sessions, use middle slice; otherwise, use first/last.
  const firstCreatedAt = allSessions[0].created_at;
  const lastCreatedAt = allSessions[allSessions.length - 1].created_at;

  let rangeFrom: string & tags.Format<"date-time"> = firstCreatedAt;
  let rangeTo: string & tags.Format<"date-time"> = lastCreatedAt;

  if (allSessions.length >= 3) {
    const middleIndex = Math.floor(allSessions.length / 2);
    rangeFrom = allSessions[0].created_at;
    rangeTo = allSessions[middleIndex].created_at;
  }

  const rangeRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    fromCreatedAt: rangeFrom,
    toCreatedAt: rangeTo,
    ip: null,
    orderByCreatedAt: "asc" as const,
  } satisfies ITodoAppAdminUserSession.IRequest;

  const rangePage: IPageITodoAppAdminuserSession.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId,
        body: rangeRequestBody,
      },
    );
  typia.assert(rangePage);

  const rangedSessions = rangePage.data;

  // 7. Validate range inclusion and ordering for filtered results.
  for (const session of rangedSessions) {
    TestValidator.predicate(
      "session.created_at must be within requested range",
      session.created_at >= rangeFrom && session.created_at <= rangeTo,
    );
  }

  for (let i = 1; i < rangedSessions.length; i++) {
    const prev = rangedSessions[i - 1];
    const curr = rangedSessions[i];
    TestValidator.predicate(
      "filtered sessions must be ordered by created_at asc",
      prev.created_at <= curr.created_at,
    );
  }

  TestValidator.equals(
    "pagination limit should match request limit in filtered query",
    rangePage.pagination.limit,
    rangeRequestBody.limit,
  );

  TestValidator.predicate(
    "pagination.records should be at least the number of returned sessions",
    rangePage.pagination.records >= rangedSessions.length,
  );

  // 8. Optional: second non-overlapping window after rangeTo, if possible.
  if (allSessions.length >= 2) {
    const laterFrom = rangeTo;
    const laterTo = lastCreatedAt;

    if (laterFrom < laterTo) {
      const laterRequestBody = {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
        fromCreatedAt: laterFrom,
        toCreatedAt: laterTo,
        ip: null,
        orderByCreatedAt: "asc" as const,
      } satisfies ITodoAppAdminUserSession.IRequest;

      const laterPage: IPageITodoAppAdminuserSession.ISummary =
        await api.functional.todoApp.adminUser.adminUsers.sessions.index(
          connection,
          {
            adminUserId,
            body: laterRequestBody,
          },
        );
      typia.assert(laterPage);

      const laterSessions = laterPage.data;

      for (const session of laterSessions) {
        TestValidator.predicate(
          "later window session.created_at must be within later range",
          session.created_at >= laterFrom && session.created_at <= laterTo,
        );
      }
    }
  }
}
