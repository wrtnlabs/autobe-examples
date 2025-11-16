import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppActorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppActorSession";
import type { ITodoAppActorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppActorSession";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

/**
 * Verify todoAdmin unified actor session search across all types.
 *
 * Business purpose:
 *
 * - Ensure that a newly registered todoAdmin (Admin A), after performing at least
 *   one authenticated admin operation, can query the unified session search
 *   endpoint and obtain a paginated list of sessions spanning all actor
 *   categories (admin/user/guest), even if in this controlled test only admin
 *   sessions are guaranteed to exist.
 *
 * Scenario steps:
 *
 * 1. Register Admin A via POST /auth/todoAdmin/join, providing realistic
 *    ITodoAppTodoAdminJoin.IRequest data (email, password, optional display
 *    name, and href/referrer URIs). This returns ITodoAppTodoAdmin.IAuthorized
 *    and implicitly creates an admin session row with connection metadata.
 * 2. As Admin A (SDK attaches Authorization token to the connection
 *    automatically), create at least one Todo status via POST
 *    /todoApp/todoAdmin/todoStatuses using ITodoAppTodoStatus.ICreate. This
 *    ensures the admin has performed an authenticated operation, making the
 *    presence of at least one admin session reasonable.
 * 3. Call PATCH /todoApp/todoAdmin/actors/sessions without actor_type filter using
 *    ITodoAppActorSession.IRequest with explicit pagination (page and limit).
 * 4. Validate that the response conforms to IPageITodoAppActorSession.ISummary and
 *    that:
 *
 *    - Pagination metadata is consistent.
 *    - Data array is non-empty and size does not exceed the requested limit.
 *    - Each ITodoAppActorSession.ISummary entry has valid id, actorType, actor, ip,
 *         href, referrer, created_at, and optional expired_at.
 *    - ActorType is always one of "admin", "user", or "guest".
 * 5. Confirm that at least one session belongs to Admin A (actorType === "admin"
 *    and actor.id === admin.id).
 * 6. By relying on the declared DTOs and typia.assert, implicitly confirm that no
 *    token or secret fields (e.g., IAuthorizationToken) are exposed in the
 *    session summaries.
 */
export async function test_api_actor_sessions_search_all_types_by_admin(
  connection: api.IConnection,
) {
  // 1. Register Admin A and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.mobile(),
    href: "https://todo-admin.example.com/dashboard",
    referrer: "https://todo-admin.example.com/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminAuthorized);

  // 2. Create at least one Todo status as Admin A
  const statusBody = {
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusBody,
    });
  typia.assert<ITodoAppTodoStatus>(createdStatus);

  // 3. Search actor sessions without actor_type filter
  const requestPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestLimit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const sessionsRequest = {
    page: requestPage,
    limit: requestLimit,
  } satisfies ITodoAppActorSession.IRequest;

  const pageResult: IPageITodoAppActorSession.ISummary =
    await api.functional.todoApp.todoAdmin.actors.sessions.index(connection, {
      body: sessionsRequest,
    });
  typia.assert<IPageITodoAppActorSession.ISummary>(pageResult);

  const pagination = pageResult.pagination;
  const sessions = pageResult.data;

  // 4. Basic pagination assertions
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed requested limit",
    sessions.length <= requestLimit,
  );

  // Ensure there is at least one session record available
  TestValidator.predicate("sessions list is non-empty", sessions.length > 0);

  // 5. Validate each ITodoAppActorSession.ISummary entry
  for (const session of sessions) {
    typia.assert<ITodoAppActorSession.ISummary>(session);

    // actorType must be one of the three allowed literals
    TestValidator.predicate(
      "actorType must be admin, user, or guest",
      session.actorType === "admin" ||
        session.actorType === "user" ||
        session.actorType === "guest",
    );

    // expired_at, when present and non-null, must be a valid date-time string
    if (session.expired_at !== null && session.expired_at !== undefined) {
      typia.assert<string & tags.Format<"date-time">>(session.expired_at);
    }
  }

  // 6. Confirm at least one session corresponds to Admin A
  const adminId = adminAuthorized.id;
  const adminSession = sessions.find((session) => {
    if (session.actorType !== "admin") return false;
    const actor = session.actor as ITodoAppTodoAdmin.ISummary;
    return actor.id === adminId;
  });

  TestValidator.predicate(
    "at least one session belongs to the newly joined admin",
    adminSession !== undefined,
  );
}
