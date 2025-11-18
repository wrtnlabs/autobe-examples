import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppRateLimitEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppRateLimitEvent";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppRateLimitEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRateLimitEvent";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate admin filtering of rate limit events by actor type, IP, and limit
 * key.
 *
 * Business context:
 *
 * - Administrators need to perform forensic searches over the rate limit log to
 *   understand which actors and client IPs are being throttled and under which
 *   logical limit keys (e.g., auth-related or todo-related limits).
 * - The backend exposes PATCH /todoApp/adminUser/rateLimitEvents to search the
 *   `todo_app_rate_limit_events` log with filters such as actor_type, ip,
 *   limit_key, limit_type, and time windows, returning a paginated summary.
 *
 * This test exercises a realistic workflow and then verifies that the admin
 * search endpoint respects actor_type, ip, and limit_key filters semantically
 * over whatever events exist, without assuming any specific rate limit policy
 * or that a particular sequence will definitely trigger limits.
 *
 * Steps:
 *
 * 1. Register a member user with a known IP, href, and referrer via POST
 *    /auth/memberUser/join, receiving an authorized context.
 * 2. Log in as the same member via POST /auth/memberUser/login using the same
 *    IP/href/referrer, verifying that the member id is stable between join and
 *    login.
 * 3. As the authenticated member, create a todo, complete it, and reopen it
 *    through /todoApp/memberUser/todos endpoints to generate normal member
 *    activity tied to this actor and IP.
 * 4. Register an admin user via POST /auth/adminUser/join, then perform an
 *    explicit admin login via POST /auth/adminUser/login, confirming the admin
 *    id is stable between join and login while establishing an admin auth
 *    context for subsequent calls.
 * 5. As the admin, call PATCH /todoApp/adminUser/rateLimitEvents with an
 *    ITodoAppRateLimitEvent.IRequest that filters on actor_type="memberUser"
 *    and the known member IP, while leaving limit_key, limit_type, and time
 *    windows null and using a small page/pageSize.
 *
 *    - Assert the response shape via typia.assert.
 *    - For each returned event, assert that actor_type is "memberUser" and, if ip is
 *         present, it equals the filtered IP.
 * 6. If at least one event is returned, pick a sample event and perform a second
 *    search with the same actor_type/IP filters and limit_key set to the sample
 *    event's limit_key. Assert that all events in this narrowed result share
 *    the same actor_type, that any non-null ip matches the filter ip, and that
 *    limit_key matches the selected key. This validates that the limit_key
 *    filter further narrows results consistently.
 * 7. Finally, call the search again with actor_type="memberUser" and ip=null to
 *    demonstrate an actor-only filter, asserting only that all returned events
 *    have actor_type="memberUser" while relying on typia.assert for structural
 *    validation.
 */
export async function test_api_admin_rate_limit_events_search_actor_ip_and_key_filters(
  connection: api.IConnection,
) {
  // 1. Register a member user with known IP and URLs
  const memberIp = "203.0.113.10";
  const memberJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Passw0rd!" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(1),
    ip: memberIp,
    href: "https://todo-app.example.com/signup" as string & tags.Format<"uri">,
    referrer: "https://marketing.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Login as the same member user (explicitly exercise login API)
  const memberLoginBody = {
    email: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: memberIp,
    href: "https://todo-app.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://todo-app.example.com/home" as string &
      tags.Format<"uri">,
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const memberAuthorizedFromLogin: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  TestValidator.equals(
    "member id should be stable between join and login",
    memberAuthorizedFromLogin.id,
    memberAuthorized.id,
  );

  // 3. As member, create a todo then complete and reopen it to generate activity
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "created todo should be pending initially",
    createdTodo.status,
    "pending",
  );

  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(completedTodo);

  TestValidator.equals(
    "completed todo should have completed status",
    completedTodo.status,
    "completed",
  );

  const reopenedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.reopen(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(reopenedTodo);

  TestValidator.equals(
    "reopened todo should return to pending status",
    reopenedTodo.status,
    "pending",
  );

  // 4. Register an admin user (admin join) and rely on token from join
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "Adm1nPass!" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(1),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Optionally exercise admin login as a separate call (role switching pattern)
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: "198.51.100.5",
    href: "https://todo-app.example.com/admin/login" as string &
      tags.Format<"uri">,
    referrer: "https://todo-app.example.com/admin" as string &
      tags.Format<"uri">,
    user_agent: "e2e-test-agent/1.0",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAuthorizedFromLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  TestValidator.equals(
    "admin id should be stable between join and login",
    adminAuthorizedFromLogin.id,
    adminAuthorized.id,
  );

  // 5. As admin, search rate limit events filtered by actor_type and IP
  const baseRequest = {
    actor_type: "memberUser",
    ip: memberIp,
    limit_key: null,
    limit_type: null,
    window_start_from: null,
    window_start_to: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: null,
    sort_order: null,
  } satisfies ITodoAppRateLimitEvent.IRequest;

  const firstPage: IPageITodoAppRateLimitEvent.ISummary =
    await api.functional.todoApp.adminUser.rateLimitEvents.index(connection, {
      body: baseRequest,
    });
  typia.assert(firstPage);

  // Validate that all returned summaries match the actor_type and IP filter semantics
  for (const event of firstPage.data) {
    typia.assert<ITodoAppRateLimitEvent.ISummary>(event);

    TestValidator.equals(
      "rate limit event actor_type should match filter",
      event.actor_type,
      baseRequest.actor_type,
    );

    if (event.ip !== null && event.ip !== undefined) {
      TestValidator.equals(
        "rate limit event IP should match filter when present",
        event.ip,
        memberIp,
      );
    }
  }

  // 6. If we have at least one event, narrow further by that event's limit_key
  const sampleEvent: ITodoAppRateLimitEvent.ISummary | undefined =
    firstPage.data[0];

  if (sampleEvent !== undefined) {
    const limitKeyFilterRequest = {
      actor_type: "memberUser",
      ip: memberIp,
      limit_key: sampleEvent.limit_key,
      limit_type: null,
      window_start_from: null,
      window_start_to: null,
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
      sort_by: null,
      sort_order: null,
    } satisfies ITodoAppRateLimitEvent.IRequest;

    const limitKeyPage: IPageITodoAppRateLimitEvent.ISummary =
      await api.functional.todoApp.adminUser.rateLimitEvents.index(connection, {
        body: limitKeyFilterRequest,
      });
    typia.assert(limitKeyPage);

    for (const event of limitKeyPage.data) {
      typia.assert<ITodoAppRateLimitEvent.ISummary>(event);

      TestValidator.equals(
        "limit-key-filtered event actor_type should remain memberUser",
        event.actor_type,
        "memberUser",
      );

      if (event.ip !== null && event.ip !== undefined) {
        TestValidator.equals(
          "limit-key-filtered event IP should still match member IP",
          event.ip,
          memberIp,
        );
      }

      TestValidator.equals(
        "limit-key-filtered event limit_key should match selected key",
        event.limit_key,
        sampleEvent.limit_key,
      );
    }
  }

  // 7. Optional: actor_type-only filter without IP, just type-check and basic invariants
  const actorOnlyRequest = {
    actor_type: "memberUser",
    ip: null,
    limit_key: null,
    limit_type: null,
    window_start_from: null,
    window_start_to: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: null,
    sort_order: null,
  } satisfies ITodoAppRateLimitEvent.IRequest;

  const actorOnlyPage: IPageITodoAppRateLimitEvent.ISummary =
    await api.functional.todoApp.adminUser.rateLimitEvents.index(connection, {
      body: actorOnlyRequest,
    });
  typia.assert(actorOnlyPage);

  for (const event of actorOnlyPage.data) {
    typia.assert<ITodoAppRateLimitEvent.ISummary>(event);

    TestValidator.equals(
      "actor-only filtered events should all be memberUser",
      event.actor_type,
      "memberUser",
    );
  }
}
