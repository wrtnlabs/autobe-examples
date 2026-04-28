import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test cursor-based pagination with date range filtering on member login sessions.
 *
 * Validates that the session list endpoint correctly applies inclusive date range filters
 * (createdAtFrom and createdAtTo) while navigating through paginated results using
 * cursor-based pagination. The date range filter must remain consistent across pages,
 * and pagination metadata must accurately reflect the filtered subset.
 *
 * The test creates multiple member sessions, retrieves the first page with a specified
 * limit within a date range, extracts the cursor from the last session ID, and uses
 * that cursor to fetch subsequent pages with the same date filter applied.
 *
 * 1. Register first member to create initial login session.
 * 2. Register second member to create additional session for pagination.
 * 3. Query first page with date range filter and limit of 5.
 * 4. Extract cursor (session ID) from last item in first page.
 * 5. Query second page using cursor with same date filter, limit of 2.
 * 6. Validate sessions fall within date range, pagination metadata is consistent.
 */
export async function test_api_session_cursor_pagination_and_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  /* 1. Register first member to create initial login session */
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(memberA);
  /* 2. Register second member to create additional login session for pagination */
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  /* 3. Configure date range filter using memberA's current connection */
  const now = new Date();
  const createdAtFrom = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAtTo = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const body1 = {
    createdAtFrom: createdAtFrom,
    createdAtTo: createdAtTo,
    limit: 5 satisfies number as number,
  } satisfies ITodoAppMemberSession.IRequest;
  /* 4. Query first page within date range with limited page size */
  const page1 = await api.functional.todoApp.sessions.index(memberAConnection, {
    body: body1,
  });
  typia.assert(page1);
  /* 5. Get cursor from last session ID of the first page */
  const lastSession = page1.data.at(-1);
  if (lastSession === undefined) {
    throw new Error("No sessions returned for pagination test");
  }
  const cursor = lastSession.id;
  /* 6. Query second page using cursor with same date filter, different limit */
  const body2 = {
    createdAtFrom: createdAtFrom,
    createdAtTo: createdAtTo,
    cursor: cursor,
    limit: 2 satisfies number as number,
  } satisfies ITodoAppMemberSession.IRequest;
  const page2 = await api.functional.todoApp.sessions.index(memberAConnection, {
    body: body2,
  });
  typia.assert(page2);
  // 7. Validate all sessions from first page fall within the date range
  if (page1.data.length > 0) {
    for (const session of page1.data) {
      TestValidator.predicate(
        `${session.id}: session createdAt within date range [${createdAtFrom}, ${createdAtTo}]`,
        session.createdAt >= createdAtFrom && session.createdAt <= createdAtTo,
      );
    }
  }
  // 8. Validate pagination metadata consistency with same date filters
  TestValidator.equals(
    "pagination records consistent across pages with same filters",
    page1.pagination.records,
    page2.pagination.records,
  );
  // 9. Validate pagination limit matches request
  TestValidator.equals(
    "page 1 limit matches request",
    page1.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 2 limit matches request",
    page2.pagination.limit,
    2,
  );
  // 10. Validate page2.data is a subset of page1.data
  if (page1.data.length > 0 && page2.data.length > 0) {
    const page1Ids = new Set(page1.data.map((s) => s.id));
    for (const session of page2.data) {
      TestValidator.predicate(
        `page2 session ${session.id} belongs to the same result set as page1`,
        page1Ids.has(session.id),
      );
    }
  } else {
    TestValidator.predicate(
      "at least one page has data to validate subset relationship",
      page1.data.length > 0 || page2.data.length > 0,
    );
  }
}
