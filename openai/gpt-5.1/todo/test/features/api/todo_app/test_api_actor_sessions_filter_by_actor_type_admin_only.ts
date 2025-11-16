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
 * Verify that administrative session search can be filtered to admin-only
 * sessions.
 *
 * Business goal
 *
 * - Ensure that PATCH /todoApp/todoAdmin/actors/sessions honors the actor_type
 *   filter when set to "admin", returning only admin sessions and including the
 *   sessions of the currently authenticated admin.
 *
 * Scenario steps
 *
 * 1. Register a new todoAdmin account (Admin A) using auth.todoAdmin.join.
 * 2. With Admin A authenticated (Authorization header managed by SDK), perform an
 *    admin-only operation (create a Todo status) so that at least one admin
 *    session exists in the system.
 * 3. Call actors.sessions.index with actor_type="admin" and a reasonable
 *    pagination request body.
 * 4. Assert the response structure and pagination metadata.
 * 5. Verify that every returned session has actorType="admin" and that for those
 *    entries, the embedded actor summary is consistent with
 *    ITodoAppTodoAdmin.ISummary.
 * 6. Confirm that at least one session belongs to Admin A by matching the actor.id
 *    with the id returned from the join call.
 */
export async function test_api_actor_sessions_filter_by_actor_type_admin_only(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin (Admin A)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminAuthorized);

  // 2. Perform an admin operation to ensure an admin session exists
  const todoStatusCreateBody = {
    code: RandomGenerator.alphabets(8),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    group: null,
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: todoStatusCreateBody,
    });
  typia.assert<ITodoAppTodoStatus>(createdStatus);

  // 3. Query actor sessions filtered by actor_type="admin"
  const sessionsRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    actor_type: "admin",
  } satisfies ITodoAppActorSession.IRequest;

  const pageResult: IPageITodoAppActorSession.ISummary =
    await api.functional.todoApp.todoAdmin.actors.sessions.index(connection, {
      body: sessionsRequestBody,
    });
  typia.assert<IPageITodoAppActorSession.ISummary>(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  const sessions: ITodoAppActorSession.ISummary[] = pageResult.data;

  // 4. Basic sanity checks on pagination and data presence
  TestValidator.predicate(
    "admin-only session query returns non-negative total records",
    pagination.records >= 0,
  );

  // Even if there are 0 records, the filter must still be consistent; however,
  // after creating a status we expect at least one admin session to exist.
  TestValidator.predicate(
    "admin-only session query returns at least one session",
    sessions.length > 0,
  );

  // 5. Validate that every session is admin-typed and actor payload shape
  for (const session of sessions) {
    // Type-level assurance
    typia.assert<ITodoAppActorSession.ISummary>(session);

    TestValidator.equals(
      "every returned session must have actorType 'admin' when filtered by admin",
      session.actorType,
      "admin",
    );

    if (session.actorType === "admin") {
      // Narrow actor to admin summary inside this branch
      const adminSummary = session.actor as ITodoAppTodoAdmin.ISummary;
      typia.assert<ITodoAppTodoAdmin.ISummary>(adminSummary);

      // Basic field sanity checks for admin summary
      TestValidator.predicate(
        "admin session actor has a non-empty email",
        adminSummary.email.length > 0,
      );
      TestValidator.predicate(
        "admin session actor has a status string",
        adminSummary.status.length > 0,
      );
    }
  }

  // 6. Verify that at least one session belongs to Admin A
  const adminId = adminAuthorized.id;
  const hasAdminASession = sessions.some((session) => {
    if (session.actorType !== "admin") return false;
    const actor = session.actor as ITodoAppTodoAdmin.ISummary;
    return actor.id === adminId;
  });

  TestValidator.predicate(
    "admin-only sessions include at least one session for the joined admin",
    hasAdminASession,
  );
}
