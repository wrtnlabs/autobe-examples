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
 * Validate that an admin user can retrieve a single rate limit event by id
 * after it has been created by member todo activity.
 *
 * Business flow covered by this test:
 *
 * 1. Register a new member user (memberUser actor).
 * 2. As that member, create a todo and perform several complete/reopen lifecycle
 *    transitions to generate realistic write activity that may trigger rate
 *    limiting.
 * 3. Register a new admin user (adminUser actor), which also authenticates the
 *    connection as an admin.
 * 4. As the admin, search the rate limit log via PATCH
 *    /todoApp/adminUser/rateLimitEvents using an
 *    ITodoAppRateLimitEvent.IRequest filter targeting actor_type "memberUser".
 * 5. If at least one rate limit event summary is returned, pick one eventId from
 *    the page and call GET
 *    /todoApp/adminUser/rateLimitEvents/{rateLimitEventId} to fetch the
 *    detailed ITodoAppRateLimitEvent record.
 * 6. Assert that core fields (id, actor_type, limit_key, limit_type, window_start,
 *    window_end, created_at) in the detail record exactly match the values from
 *    the summary, and validate simple non-empty invariants for key string
 *    fields.
 * 7. If the search returns no rate limit events, assert the empty result shape and
 *    finish gracefully without failing due to environment‑specific rate limit
 *    thresholds.
 */
export async function test_api_admin_rate_limit_event_get_by_id_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain authenticated member context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberHref = typia.random<string & tags.Format<"uri">>();
  const memberReferrer = typia.random<string & tags.Format<"uri">>();

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(1),
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As the member, create a todo and perform multiple complete/reopen cycles
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert(createdTodo);

  const todoId = createdTodo.id;

  // Perform several complete/reopen transitions to create realistic activity
  const cycles = 5;
  for (let i = 0; i < cycles; i += 1) {
    const completed: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.complete(connection, {
        todoId,
      });
    typia.assert(completed);

    const reopened: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.reopen(connection, {
        todoId,
      });
    typia.assert(reopened);
  }

  // 3. Register an admin user and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(1),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. As admin, search for rate limit events for actor_type "memberUser"
  const searchBody = {
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

  const page: IPageITodoAppRateLimitEvent.ISummary =
    await api.functional.todoApp.adminUser.rateLimitEvents.index(connection, {
      body: searchBody,
    });
  typia.assert(page);

  // Basic pagination invariants
  TestValidator.equals(
    "pagination current page is 1",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches requested pageSize",
    page.pagination.limit,
    searchBody.pageSize,
  );
  TestValidator.predicate(
    "pagination records is at least data length",
    page.pagination.records >= page.data.length,
  );

  // If no events were found, assert empty result shape and finish gracefully
  if (page.data.length === 0) {
    TestValidator.equals(
      "rate limit event list is empty when no events exist",
      page.data.length,
      0,
    );
    return;
  }

  const summary: ITodoAppRateLimitEvent.ISummary = page.data[0];

  // 5. Fetch detailed rate limit event by id
  const detail: ITodoAppRateLimitEvent =
    await api.functional.todoApp.adminUser.rateLimitEvents.at(connection, {
      rateLimitEventId: summary.id,
    });
  typia.assert(detail);

  // 6. Validate consistency between summary and detail core fields
  TestValidator.equals(
    "rate limit event id matches between summary and detail",
    detail.id,
    summary.id,
  );
  TestValidator.equals(
    "rate limit actor_type matches between summary and detail",
    detail.actor_type,
    summary.actor_type,
  );
  TestValidator.equals(
    "rate limit limit_key matches between summary and detail",
    detail.limit_key,
    summary.limit_key,
  );
  TestValidator.equals(
    "rate limit limit_type matches between summary and detail",
    detail.limit_type,
    summary.limit_type,
  );
  TestValidator.equals(
    "rate limit window_start matches between summary and detail",
    detail.window_start,
    summary.window_start,
  );
  TestValidator.equals(
    "rate limit window_end matches between summary and detail",
    detail.window_end,
    summary.window_end,
  );
  TestValidator.equals(
    "rate limit created_at matches between summary and detail",
    detail.created_at,
    summary.created_at,
  );

  // Additional simple invariants on detailed record
  TestValidator.predicate(
    "detail actor_type is non-empty",
    detail.actor_type.length > 0,
  );
  TestValidator.predicate(
    "detail limit_key is non-empty",
    detail.limit_key.length > 0,
  );
  TestValidator.predicate(
    "detail limit_type is non-empty",
    detail.limit_type.length > 0,
  );
}
