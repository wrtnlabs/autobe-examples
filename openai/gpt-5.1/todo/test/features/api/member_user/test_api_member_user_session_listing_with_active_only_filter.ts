import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberuserSession";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuserSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_member_user_session_listing_with_active_only_filter(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create and complete a todo for realistic activity
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert(createdTodo);

  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(completedTodo);

  // 3. List sessions with activeOnly=true
  const now = Date.now();

  const activeOnlyRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    activeOnly: true,
    createdFrom: null,
    createdTo: null,
  } satisfies ITodoAppMemberuserSession.IRequest;

  const activeOnlyPage: IPageITodoAppMemberuserSession.ISummary =
    await api.functional.todoApp.memberUser.memberUsers.sessions.index(
      connection,
      {
        memberUserId: authorized.id,
        body: activeOnlyRequest,
      },
    );
  typia.assert<IPageITodoAppMemberuserSession.ISummary>(activeOnlyPage);

  // 3-1. Validate that all sessions in activeOnly list are active
  for (const session of activeOnlyPage.data) {
    const expiredAt = session.expired_at ?? null;
    const isActive = expiredAt === null || Date.parse(expiredAt) > now;

    TestValidator.predicate(
      "all sessions in activeOnly=true result must be active",
      isActive,
    );
  }

  // 4. List sessions with activeOnly=false
  const allSessionsRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    activeOnly: false,
    createdFrom: null,
    createdTo: null,
  } satisfies ITodoAppMemberuserSession.IRequest;

  const allSessionsPage: IPageITodoAppMemberuserSession.ISummary =
    await api.functional.todoApp.memberUser.memberUsers.sessions.index(
      connection,
      {
        memberUserId: authorized.id,
        body: allSessionsRequest,
      },
    );
  typia.assert<IPageITodoAppMemberuserSession.ISummary>(allSessionsPage);

  // 4-1. Basic pagination sanity checks
  TestValidator.predicate(
    "non-filtered sessions.records must be >= filtered sessions.records",
    allSessionsPage.pagination.records >= activeOnlyPage.pagination.records,
  );

  TestValidator.predicate(
    "non-filtered data length must be >= filtered data length",
    allSessionsPage.data.length >= activeOnlyPage.data.length,
  );

  // 5. Verify that every activeOnly session id exists in the broader list
  const allIds = new Set(allSessionsPage.data.map((s) => s.id));

  for (const session of activeOnlyPage.data) {
    TestValidator.predicate(
      "activeOnly session id must exist in non-filtered result",
      allIds.has(session.id),
    );
  }

  // 6. If there are any clearly expired sessions in the non-filtered list,
  //    ensure they do not appear in the activeOnly list.
  const activeOnlyIds = new Set(activeOnlyPage.data.map((s) => s.id));

  const expiredSessions: ITodoAppMemberuserSession.ISummary[] =
    allSessionsPage.data.filter((session) => {
      if (session.expired_at === null || session.expired_at === undefined)
        return false;
      return Date.parse(session.expired_at) < now;
    });

  if (expiredSessions.length > 0) {
    for (const expired of expiredSessions) {
      TestValidator.predicate(
        "expired sessions must not be included when activeOnly=true",
        activeOnlyIds.has(expired.id) === false,
      );
    }
  }
}
