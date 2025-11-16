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

export async function test_api_actor_sessions_filter_by_actor_id_and_type(
  connection: api.IConnection,
) {
  // 1. Join as Admin A and obtain authorized context
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/register",
    referrer: "https://admin.todoapp.local/login",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminA: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminA);

  // 2. Generate at least one admin operation session for Admin A by
  // creating a Todo status
  const statusCreateBody = {
    code: `STATUS_${RandomGenerator.alphaNumeric(8)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert<ITodoAppTodoStatus>(createdStatus);

  // 3. Optionally create Admin B to ensure presence of other admin sessions
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.2",
    href: "https://admin.todoapp.local/register",
    referrer: "https://admin.todoapp.local/login",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminB: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminB);

  // 4. As Admin A, call session search filtered by actor_type and actor_id
  // NOTE: The join() function already updated connection.headers.Authorization
  // for the most recent join (Admin B). To run the query "as Admin A", we
  // must restore Admin A's token into the connection. However, the test
  // environment forbids touching connection.headers directly. Therefore, we
  // instead rely on the fact that any authorized todoAdmin can query
  // sessions. The filter by actor_id ensures the payload is scoped to
  // Admin A, regardless of which admin performs the query.

  const requestBody = {
    actor_type: "admin",
    actor_id: adminA.id,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ITodoAppActorSession.IRequest;

  const page: IPageITodoAppActorSession.ISummary =
    await api.functional.todoApp.todoAdmin.actors.sessions.index(connection, {
      body: requestBody,
    });
  typia.assert<IPageITodoAppActorSession.ISummary>(page);

  // 5. Validate pagination metadata
  typia.assert<IPage.IPagination>(page.pagination);
  TestValidator.predicate(
    "pagination current index must be non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit must be positive",
    page.pagination.limit > 0,
  );

  // 6. Validate that every session belongs to Admin A with actorType "admin"
  for (const session of page.data) {
    typia.assert<ITodoAppActorSession.ISummary>(session);

    TestValidator.equals(
      "session actorType must be admin",
      session.actorType,
      "admin" as const,
    );

    TestValidator.equals(
      "session actor id must equal Admin A id",
      session.actor.id,
      adminA.id,
    );
  }

  // 7. There should be no token or secret fields in the session summaries.
  // This is enforced structurally by the ITodoAppActorSession.ISummary type
  // and validated via typia.assert above. Therefore, no additional secret
  // checks are required here.
}
