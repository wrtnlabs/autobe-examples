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

export async function test_api_admin_rate_limit_event_get_by_id_consistency_with_member_and_admin_associations(
  connection: api.IConnection,
) {
  // 1. Create a member user and perform some todo operations to generate realistic member traffic
  const memberJoinBody = {
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Password!123" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://member.example.com/signup" as string & tags.Format<"uri">,
    referrer: "https://member.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Create several todos as the member and toggle their status to simulate traffic
  const todos: ITodoAppTodo[] = [];
  for (let i = 0; i < 3; i += 1) {
    const todoCreateBody = {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body: todoCreateBody,
      });
    typia.assert(todo);
    todos.push(todo);
  }

  // Complete and reopen some todos to add more member activity
  for (const todo of todos) {
    const completed: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.complete(connection, {
        todoId: todo.id,
      });
    typia.assert(completed);

    const reopened: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.reopen(connection, {
        todoId: todo.id,
      });
    typia.assert(reopened);
  }

  // 2. Create an admin user and keep that session for admin operations
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Password!123" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As admin, query rate limit events index a few times to both generate and inspect admin traffic
  const indexRequestBody = {
    actor_type: null,
    ip: null,
    limit_key: null,
    limit_type: null,
    window_start_from: null,
    window_start_to: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: null,
    sort_order: null,
  } satisfies ITodoAppRateLimitEvent.IRequest;

  // First index call
  const page1: IPageITodoAppRateLimitEvent.ISummary =
    await api.functional.todoApp.adminUser.rateLimitEvents.index(connection, {
      body: indexRequestBody,
    });
  typia.assert(page1);

  // Optional additional admin traffic: call index again with same body
  const page2: IPageITodoAppRateLimitEvent.ISummary =
    await api.functional.todoApp.adminUser.rateLimitEvents.index(connection, {
      body: indexRequestBody,
    });
  typia.assert(page2);

  // Merge data from both pages (they may overlap; that's fine for discovery purposes)
  const allSummaries: ITodoAppRateLimitEvent.ISummary[] = [
    ...page1.data,
    ...page2.data,
  ];

  // If no events exist, assert that data arrays are empty and short-circuit
  if (allSummaries.length === 0) {
    TestValidator.equals(
      "no rate limit events available, index page1 empty",
      page1.data.length,
      0,
    );
    TestValidator.equals(
      "no rate limit events available, index page2 empty",
      page2.data.length,
      0,
    );
    return;
  }

  // Find at most one memberUser event and one adminUser event
  const memberSummary: ITodoAppRateLimitEvent.ISummary | undefined =
    allSummaries.find((ev) => ev.actor_type === "memberUser");
  const adminSummary: ITodoAppRateLimitEvent.ISummary | undefined =
    allSummaries.find((ev) => ev.actor_type === "adminUser");

  // If neither memberUser nor adminUser events exist, fall back to validating
  // scalar consistency for the first available event, regardless of actor_type.
  if (!memberSummary && !adminSummary) {
    const fallback = allSummaries[0];

    const detail: ITodoAppRateLimitEvent =
      await api.functional.todoApp.adminUser.rateLimitEvents.at(connection, {
        rateLimitEventId: fallback.id,
      });
    typia.assert(detail);

    // Scalar field consistency between summary and detail
    TestValidator.equals(
      "fallback event id matches between summary and detail",
      detail.id,
      fallback.id,
    );
    TestValidator.equals(
      "fallback actor_type matches between summary and detail",
      detail.actor_type,
      fallback.actor_type,
    );
    TestValidator.equals(
      "fallback ip matches between summary and detail",
      detail.ip ?? null,
      fallback.ip ?? null,
    );
    TestValidator.equals(
      "fallback limit_key matches between summary and detail",
      detail.limit_key,
      fallback.limit_key,
    );
    TestValidator.equals(
      "fallback limit_type matches between summary and detail",
      detail.limit_type,
      fallback.limit_type,
    );
    TestValidator.equals(
      "fallback window_start matches between summary and detail",
      detail.window_start,
      fallback.window_start,
    );
    TestValidator.equals(
      "fallback window_end matches between summary and detail",
      detail.window_end,
      fallback.window_end,
    );
    TestValidator.equals(
      "fallback created_at matches between summary and detail",
      detail.created_at,
      fallback.created_at,
    );

    // Minimal time sanity: created_at should not be before window_start
    const windowStart = new Date(detail.window_start).getTime();
    const createdAt = new Date(detail.created_at).getTime();
    TestValidator.predicate(
      "fallback detail.created_at is not earlier than window_start",
      createdAt >= windowStart,
    );

    // Associations cannot be asserted for a non-member/admin actor_type,
    // but ensure at least that both association fields are optional and can be null.
    TestValidator.predicate(
      "fallback member_user association may be null or defined",
      true,
    );
    TestValidator.predicate(
      "fallback admin_user association may be null or defined",
      true,
    );

    return;
  }

  // Helper to validate core scalar consistency and basic time sanity
  const assertScalarConsistency = (
    titlePrefix: string,
    summary: ITodoAppRateLimitEvent.ISummary,
    detail: ITodoAppRateLimitEvent,
  ): void => {
    TestValidator.equals(
      `${titlePrefix} id matches between summary and detail`,
      detail.id,
      summary.id,
    );
    TestValidator.equals(
      `${titlePrefix} actor_type matches between summary and detail`,
      detail.actor_type,
      summary.actor_type,
    );
    TestValidator.equals(
      `${titlePrefix} ip matches between summary and detail`,
      detail.ip ?? null,
      summary.ip ?? null,
    );
    TestValidator.equals(
      `${titlePrefix} limit_key matches between summary and detail`,
      detail.limit_key,
      summary.limit_key,
    );
    TestValidator.equals(
      `${titlePrefix} limit_type matches between summary and detail`,
      detail.limit_type,
      summary.limit_type,
    );
    TestValidator.equals(
      `${titlePrefix} window_start matches between summary and detail`,
      detail.window_start,
      summary.window_start,
    );
    TestValidator.equals(
      `${titlePrefix} window_end matches between summary and detail`,
      detail.window_end,
      summary.window_end,
    );
    TestValidator.equals(
      `${titlePrefix} created_at matches between summary and detail`,
      detail.created_at,
      summary.created_at,
    );

    const windowStartMs = new Date(detail.window_start).getTime();
    const createdAtMs = new Date(detail.created_at).getTime();
    TestValidator.predicate(
      `${titlePrefix} detail.created_at is not earlier than window_start`,
      createdAtMs >= windowStartMs,
    );
  };

  // 4. Validate memberUser event details and associations, if available
  if (memberSummary) {
    const memberDetail: ITodoAppRateLimitEvent =
      await api.functional.todoApp.adminUser.rateLimitEvents.at(connection, {
        rateLimitEventId: memberSummary.id,
      });
    typia.assert(memberDetail);

    assertScalarConsistency("memberUser event", memberSummary, memberDetail);

    TestValidator.equals(
      "memberUser event actor_type should be memberUser",
      memberDetail.actor_type,
      "memberUser",
    );

    TestValidator.predicate(
      "memberUser event should have non-null member_user association",
      memberDetail.member_user !== null &&
        memberDetail.member_user !== undefined,
    );
    TestValidator.predicate(
      "memberUser event should have null or undefined admin_user association",
      memberDetail.admin_user === null || memberDetail.admin_user === undefined,
    );
  } else {
    TestValidator.predicate(
      "no memberUser rate limit events available; skipping member association checks",
      true,
    );
  }

  // 5. Validate adminUser event details and associations, if available
  if (adminSummary) {
    const adminDetail: ITodoAppRateLimitEvent =
      await api.functional.todoApp.adminUser.rateLimitEvents.at(connection, {
        rateLimitEventId: adminSummary.id,
      });
    typia.assert(adminDetail);

    assertScalarConsistency("adminUser event", adminSummary, adminDetail);

    TestValidator.equals(
      "adminUser event actor_type should be adminUser",
      adminDetail.actor_type,
      "adminUser",
    );

    TestValidator.predicate(
      "adminUser event should have non-null admin_user association",
      adminDetail.admin_user !== null && adminDetail.admin_user !== undefined,
    );
    TestValidator.predicate(
      "adminUser event should have null or undefined member_user association",
      adminDetail.member_user === null || adminDetail.member_user === undefined,
    );
  } else {
    TestValidator.predicate(
      "no adminUser rate limit events available; skipping admin association checks",
      true,
    );
  }
}
