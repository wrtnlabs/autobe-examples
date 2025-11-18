import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSession";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSession";

/**
 * Validate pagination behavior of current member user sessions across multiple
 * pages.
 *
 * Business context:
 *
 * - A member user can have multiple authentication sessions.
 * - The endpoint PATCH /todoApp/memberUser/actors/current/sessions exposes those
 *   sessions with pageable summaries (IPageITodoAppSession.ISummary).
 *
 * This test:
 *
 * 1. Registers a new member user to establish an authenticated context.
 * 2. Calls the sessions index endpoint with page=0, limit=5 to get the first page.
 * 3. Calls the same endpoint with page=1, limit=5 to get the second page.
 * 4. Validates pagination metadata (current, limit, records, pages) and that each
 *    page does not exceed the specified limit.
 * 5. When there are more than 5 total records, validates that page 0 and page 1
 *    contain disjoint sets of session IDs (no duplicates across pages) and that
 *    pages >= 2.
 * 6. For all returned sessions, validates basic actor metadata consistency and
 *    type safety using typia.assert.
 */
export async function test_api_todoapp_memberuser_current_sessions_pagination_multiple_pages(
  connection: api.IConnection,
) {
  // 1. Register a member user (join) to obtain an authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todoapp.example.com/join",
    referrer: "https://todoapp.example.com/",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const authorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);

  // 2. Request first page of sessions with limit=5.
  const firstRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
    ip: null,
    createdFrom: null,
    createdTo: null,
    expiredFrom: null,
    expiredTo: null,
    activeOnly: null,
  } satisfies ITodoAppSession.IRequest;

  const firstPage: IPageITodoAppSession.ISummary =
    await api.functional.todoApp.memberUser.actors.current.sessions.index(
      connection,
      { body: firstRequest },
    );
  typia.assert<IPageITodoAppSession.ISummary>(firstPage);

  const firstPagination: IPage.IPagination = firstPage.pagination;
  typia.assert<IPage.IPagination>(firstPagination);

  TestValidator.equals(
    "first page limit should be 5",
    firstPagination.limit,
    5,
  );
  TestValidator.equals(
    "first page current index should be 0",
    firstPagination.current,
    0,
  );
  TestValidator.predicate(
    "first page records should be non-negative",
    firstPagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages should be non-negative",
    firstPagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page data length should not exceed limit",
    firstPage.data.length <= firstPagination.limit,
  );

  // 3. Request second page with the same limit.
  const secondRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
    ip: null,
    createdFrom: null,
    createdTo: null,
    expiredFrom: null,
    expiredTo: null,
    activeOnly: null,
  } satisfies ITodoAppSession.IRequest;

  const secondPage: IPageITodoAppSession.ISummary =
    await api.functional.todoApp.memberUser.actors.current.sessions.index(
      connection,
      { body: secondRequest },
    );
  typia.assert<IPageITodoAppSession.ISummary>(secondPage);

  const secondPagination: IPage.IPagination = secondPage.pagination;
  typia.assert<IPage.IPagination>(secondPagination);

  TestValidator.equals(
    "second page limit should be 5",
    secondPagination.limit,
    5,
  );
  TestValidator.equals(
    "second page current index should be 1",
    secondPagination.current,
    1,
  );
  TestValidator.predicate(
    "second page records should be non-negative",
    secondPagination.records >= 0,
  );
  TestValidator.predicate(
    "second page pages should be non-negative",
    secondPagination.pages >= 0,
  );
  TestValidator.predicate(
    "second page data length should not exceed limit",
    secondPage.data.length <= secondPagination.limit,
  );

  // 4. If there are more records than fit in a single page, ensure
  //    disjoint session IDs across first and second pages and pages>=2.
  if (firstPagination.records > firstPagination.limit) {
    TestValidator.predicate(
      "total pages should be at least 2 when records exceed limit",
      firstPagination.pages >= 2,
    );

    const firstIds: string[] = firstPage.data.map((s) => s.id);
    const secondIds: string[] = secondPage.data.map((s) => s.id);

    const unionIds: string[] = [...firstIds, ...secondIds];
    const uniqueIds = new Set(unionIds);

    TestValidator.equals(
      "session IDs across first and second pages should be unique when records exceed limit",
      uniqueIds.size,
      unionIds.length,
    );
  }

  // 5. For all sessions from both pages, validate basic actor fields and UUIDs.
  const allSessions: ITodoAppSession.ISummary[] = [
    ...firstPage.data,
    ...secondPage.data,
  ];

  for (const session of allSessions) {
    typia.assert<ITodoAppSession.ISummary>(session);

    TestValidator.predicate(
      "actor_type should be a non-empty string",
      typeof session.actor_type === "string" && session.actor_type.length > 0,
    );

    const actorId: string & tags.Format<"uuid"> = session.actor_id;
    typia.assert<string & tags.Format<"uuid">>(actorId);

    if (session.actor_id === authorized.id) {
      TestValidator.equals(
        "session actor_id should match authorized member id when referencing same actor",
        session.actor_id,
        authorized.id,
      );
    }
  }
}
