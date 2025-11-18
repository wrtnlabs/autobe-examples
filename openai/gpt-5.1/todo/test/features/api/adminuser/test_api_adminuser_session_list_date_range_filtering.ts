import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminuserSession";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminuserSession";

export async function test_api_adminuser_session_list_date_range_filtering(
  connection: api.IConnection,
) {
  // 1. Join as an admin user to establish authentication context and create at least one session
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const authorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinInput,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorized);

  const adminId = authorized.id;

  // Helper to call sessions.index with arbitrary IRequest and assert the response
  const listSessions = async (
    body: ITodoAppAdminuserSession.IRequest,
  ): Promise<IPageITodoAppAdminuserSession.ISummary> => {
    const page =
      await api.functional.todoApp.adminUser.adminUsers.sessions.index(
        connection,
        {
          adminUserId: adminId,
          body,
        },
      );
    typia.assert<IPageITodoAppAdminuserSession.ISummary>(page);
    return page;
  };

  // 2. Initial wide-open query (no from/to filters) to fetch existing sessions for this admin
  const initialRequest = {
    page: 1,
    limit: 50,
    from_created_at: null,
    to_created_at: null,
    only_active: null,
    sort_created_at_desc: null,
  } satisfies ITodoAppAdminuserSession.IRequest;

  const initialPage = await listSessions(initialRequest);

  // Ensure the pagination object is structurally correct
  typia.assert<IPage.IPagination>(initialPage.pagination);

  // If there are no sessions, the test can only assert that filters return empty sets consistently
  if (initialPage.data.length === 0) {
    // With no sessions, any non-null date range should return empty data
    const from = new Date().toISOString();
    const to = new Date(Date.now() + 60_000).toISOString();

    const filteredPage = await listSessions({
      page: 1,
      limit: 50,
      from_created_at: from,
      to_created_at: to,
      only_active: null,
      sort_created_at_desc: null,
    });

    TestValidator.equals(
      "no sessions => filtered result should also be empty",
      filteredPage.data,
      [],
    );
    return;
  }

  // 3. Pick a representative session S from the existing list
  const session: ITodoAppAdminuserSession.ISummary = initialPage.data[0];
  typia.assert<ITodoAppAdminuserSession.ISummary>(session);

  const sessionCreatedAt = session.created_at;

  // 4. Construct an inclusive window [S.created_at, S.created_at]
  const inclusiveRequest = {
    page: 1,
    limit: 50,
    from_created_at: sessionCreatedAt,
    to_created_at: sessionCreatedAt,
    only_active: null,
    sort_created_at_desc: null,
  } satisfies ITodoAppAdminuserSession.IRequest;

  const inclusivePage = await listSessions(inclusiveRequest);

  // Validate that all sessions are within the inclusive window
  for (const s of inclusivePage.data) {
    TestValidator.predicate(
      "inclusive window: session.created_at >= from_created_at",
      s.created_at >= inclusiveRequest.from_created_at!,
    );
    TestValidator.predicate(
      "inclusive window: session.created_at <= to_created_at",
      s.created_at <= inclusiveRequest.to_created_at!,
    );
  }

  // At least one session in the inclusive window should have the same id as our reference session
  const inclusiveContainsReference = inclusivePage.data.some(
    (s) => s.id === session.id,
  );
  TestValidator.predicate(
    "inclusive window should contain the reference session",
    inclusiveContainsReference,
  );

  // 5. Construct a window that starts strictly after S.created_at to exclude S
  // Since we only have ISO-8601 strings, we use Date arithmetic and convert back to ISO string.
  const baseDate = new Date(sessionCreatedAt);
  const afterDate = new Date(baseDate.getTime() + 1_000); // +1 second
  const farFuture = new Date(baseDate.getTime() + 60 * 60 * 1000); // +1 hour

  const exclusiveRequest = {
    page: 1,
    limit: 50,
    from_created_at: afterDate.toISOString(),
    to_created_at: farFuture.toISOString(),
    only_active: null,
    sort_created_at_desc: null,
  } satisfies ITodoAppAdminuserSession.IRequest;

  const exclusivePage = await listSessions(exclusiveRequest);

  for (const s of exclusivePage.data) {
    TestValidator.predicate(
      "exclusive window: session.created_at >= from_created_at (after reference)",
      s.created_at >= exclusiveRequest.from_created_at!,
    );
    TestValidator.predicate(
      "exclusive window: session.created_at <= to_created_at",
      s.created_at <= exclusiveRequest.to_created_at!,
    );
  }

  // Confirm that the reference session is not included in this later window
  const exclusiveContainsReference = exclusivePage.data.some(
    (s) => s.id === session.id,
  );
  TestValidator.predicate(
    "exclusive window should not contain the reference session",
    exclusiveContainsReference === false,
  );
}
