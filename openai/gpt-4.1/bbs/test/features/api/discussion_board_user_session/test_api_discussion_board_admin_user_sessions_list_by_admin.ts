import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";

/**
 * Validate that an authenticated administrator can retrieve a paginated list of
 * user session records for a specific user, supporting advanced filtering and
 * proper authorization.
 *
 * Business context: Administrators must be able to audit and review the session
 * history of users, including filtering by creation time, session status
 * (expired/active), or IP address, to ensure compliance and enable security
 * investigations. The endpoint is authorization-gated: only authenticated
 * admins can access user sessions, and the response must use correct
 * pagination.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin user
 * 2. Query the session index API with a randomly generated userId (UUID format),
 *    including pagination and advanced filter parameters:
 *
 *    - Page: 1, pageSize: 10
 *    - Filter by createdFrom and createdTo (valid date-time range)
 *    - Filter by session status (expired: true)
 *    - Filter by random IP address (string)
 * 3. Assert that the API responds with a valid paginated data structure (matches
 *    IPageIDiscussionBoardUserSession.ISummary), and pagination fields are
 *    present
 * 4. Assert that all returned session records, if any, respect the filter criteria
 *    (created time within range, expired status, correct IP if specified)
 * 5. Ensure that only authenticated admin can call this endpoint
 * 6. Validate edge cases: filter yields empty result, or response data is present
 */
export async function test_api_discussion_board_admin_user_sessions_list_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "1!A",
    href: "https://admin.example.com/dashboard",
    referrer: "https://example.com/landing",
    ip:
      "10.0." +
      Math.floor(Math.random() * 256) +
      "." +
      Math.floor(Math.random() * 256),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. List user session records (for a random user)
  const userId = typia.random<string & tags.Format<"uuid">>();
  const dateFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString(); // 30 days ago
  const dateTo = new Date().toISOString();
  const ip =
    "10.1." +
    Math.floor(Math.random() * 256) +
    "." +
    Math.floor(Math.random() * 256);
  const searchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    createdFrom: dateFrom,
    createdTo: dateTo,
    expired: true,
    ip: ip,
  } satisfies IDiscussionBoardUserSession.IRequest;
  const page: IPageIDiscussionBoardUserSession.ISummary =
    await api.functional.discussionBoard.admin.users.sessions.index(
      connection,
      {
        userId,
        body: searchBody,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "pagination fields present",
    typeof page.pagination !== "undefined",
  );
  TestValidator.predicate("data array present", Array.isArray(page.data));

  // 3. If any session records are returned, their filters must match
  for (const session of page.data) {
    typia.assert(session);
    if (session.created_at < dateFrom || session.created_at > dateTo) {
      throw new Error(
        `Session created_at ${session.created_at} out of filter range: ${dateFrom} ~ ${dateTo}`,
      );
    }
    if (searchBody.expired === true) {
      TestValidator.predicate(
        "expired_at must not be null for expired filter true",
        session.expired_at !== null && session.expired_at !== undefined,
      );
    }
    if (searchBody.ip !== null && searchBody.ip !== undefined) {
      TestValidator.equals(
        "session IP matches filter",
        session.ip,
        searchBody.ip,
      );
    }
  }

  // 4. Edge case: filter yielding empty result
  const noResultBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    createdFrom: new Date(
      Date.now() - 10 * 365 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 10 years ago
    createdTo: new Date(
      Date.now() - 9 * 365 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 9 years ago
    expired: true,
    ip: "192.168.255.255",
  } satisfies IDiscussionBoardUserSession.IRequest;
  const noResult =
    await api.functional.discussionBoard.admin.users.sessions.index(
      connection,
      {
        userId,
        body: noResultBody,
      },
    );
  typia.assert(noResult);
  TestValidator.equals(
    "empty result for extreme filters",
    noResult.data.length === 0 ? 0 : 1,
    0,
  );

  // 5. Ensure only authorized admins access sessions (simulate unauthenticated conn)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access should be rejected",
    async () => {
      await api.functional.discussionBoard.admin.users.sessions.index(
        unauthConn,
        {
          userId: typia.random<string & tags.Format<"uuid">>(),
          body: searchBody,
        },
      );
    },
  );
}
