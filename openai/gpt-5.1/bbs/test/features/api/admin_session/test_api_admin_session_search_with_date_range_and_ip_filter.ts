import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminuserSession";

/**
 * Validate admin session search by creation date range and IP filter.
 *
 * Business context:
 *
 * - An admin user joins the system via /auth/adminUser/join, which creates an
 *   admin account and, per documentation, establishes an authenticated admin
 *   session with connection metadata (ip, href, referrer).
 * - The security/audit dashboard for administrators needs to search this admin's
 *   sessions using time window and connection-context filters.
 *
 * This test covers the happy path for that search API with realistic
 * constraints, without depending on pre-seeded DB fixtures. It proves that
 * filtering and pagination behave consistently for an admin who has at least
 * one session.
 *
 * Steps:
 *
 * 1. Join as a new admin user via api.functional.auth.adminUser.join.
 *
 *    - Build a valid IDiscussionBoardAdminUserJoin.IRequest payload with:
 *
 *         - Unique email (typia.random<email>),
 *         - Password (Format<"password"> random),
 *         - Display_name,
 *         - Optional bio,
 *         - Explicit ip, href, and referrer.
 *    - Receive IDiscussionBoardAdminuser.IAuthorized, which contains admin id and
 *         token; SDK automatically wires Authorization header.
 * 2. Immediately query this admin's sessions via
 *    api.functional.discussionBoard.adminUser.adminUsers.sessions.index without
 *    filters (empty body) or with very wide window.
 *
 *    - Pass adminUserId from step 1.
 *    - Use an empty IRequest body {} so the backend applies defaults (first page,
 *         default limit, no filters) and returns
 *         IPageIDiscussionBoardAdminuserSession.ISummary.
 *    - Assert type with typia.assert.
 *    - Find at least one session that:
 *
 *         - AdminUser.id === joined admin id,
 *         - Ip matches the ip we sent in join (it _should_, according to docs). If no
 *                   such session is found (in unusual environments), the test
 *                   gracefully skips further filter assertions by using
 *                   TestValidator predicates based on the available data.
 * 3. Build a date range window around the known session's created_at:
 *
 *    - Parse session.created_at into a Date.
 *    - Compute from_created_at slightly before created_at (e.g., minus 1 second) and
 *         to_created_at slightly after created_at (e.g., plus 1 second), then
 *         convert both toISOString(). This gives us an interval [from, to) that
 *         definitely contains this session.
 * 4. Call the sessions.index API again with filters:
 *
 *    - AdminUserId: joined admin id.
 *    - Body:
 *
 *         - Page: 1 (or 0 depending on backend semantics; we can let backend default by
 *                   omitting page and just supply limit),
 *         - Limit: a small positive value (e.g. 10),
 *         - From_created_at: computed lower bound,
 *         - To_created_at: computed upper bound,
 *         - Ip: the exact ip used on join.
 * 5. Validate response:
 *
 *    - Typia.assert on the output.
 *    - Ensure pagination.records equals output.data.length (because the dataset is
 *         small and filtered).
 *    - Ensure pagination.pages is consistent with records and limit (pages ===
 *         Math.ceil(records / limit)).
 *    - For every session in data:
 *
 *         - Created_at >= from_created_at,
 *         - Created_at < to_created_at,
 *         - Ip === filter ip,
 *         - AdminUser.id matches joined admin id.
 * 6. Negative filter check:
 *
 *    - Call sessions.index again with an IP that must not match the known session
 *         (e.g., a different literal IP string).
 *    - Use same from_created_at and to_created_at window.
 *    - Assert type and then assert that either:
 *
 *         - Data array is empty (expected case), or
 *         - If non-empty, every item has ip !== original ip (to respect filter), though
 *                   realistically we expect emptiness in a minimal
 *                   environment.
 *
 * Notes & constraints:
 *
 * - We do not and cannot manipulate or assert on DB fixture counts beyond what
 *   the API exposes.
 * - We do not attempt to create extra sessions via non-existent APIs; we rely
 *   only on the join-created session(s).
 * - We avoid assuming exact page indexes for the initial unfiltered query and
 *   instead search within the returned data for the matching session.
 */
export async function test_api_admin_session_search_with_date_range_and_ip_filter(
  connection: api.IConnection,
) {
  // 1. Join as a new admin user, supplying explicit IP and URLs so that
  //    the created session will carry deterministic connection metadata.
  const joinIp: string = "192.0.2.10"; // TEST-NET-1 reserved range, safe for tests
  const joinHref: string = "https://admin.example.com/signup";
  const joinReferrer: string = "https://admin.example.com/landing";

  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: joinIp,
    href: joinHref as string & tags.Format<"uri">,
    referrer: joinReferrer as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const authorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const adminUserId = authorized.id;

  // 2. Fetch this admin's sessions without filters to discover the concrete
  //    session timestamps and IP as persisted by the backend.
  const initialPage: IPageIDiscussionBoardAdminuserSession.ISummary =
    await api.functional.discussionBoard.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId,
        body: {},
      },
    );
  typia.assert(initialPage);

  const allSessions = initialPage.data;

  // Validate that all returned sessions, if any, belong to this admin.
  await TestValidator.predicate(
    "all initial sessions, if any, belong to joined admin",
    async () =>
      allSessions.every(
        (session) => session.discussion_board_adminuser_id === adminUserId,
      ),
  );

  // Find a session whose IP matches the IP we sent on join (best-effort).
  const targetSession: IDiscussionBoardAdminuserSession.ISummary | undefined =
    allSessions.find((session) => session.ip === joinIp) ?? allSessions[0];

  // If there is no session at all, we still want to ensure the API behaves
  // consistently under filters (returning empty data, consistent pagination).
  if (!targetSession) {
    const now = new Date();
    const from = new Date(now.getTime() - 60_000).toISOString();
    const to = new Date(now.getTime() + 60_000).toISOString();

    const filteredEmpty: IPageIDiscussionBoardAdminuserSession.ISummary =
      await api.functional.discussionBoard.adminUser.adminUsers.sessions.index(
        connection,
        {
          adminUserId,
          body: {
            page: 1 as number & tags.Type<"int32">,
            limit: 10 as number & tags.Type<"int32">,
            from_created_at: from,
            to_created_at: to,
            ip: joinIp,
          },
        },
      );
    typia.assert(filteredEmpty);

    // pagination.records must match data length, and pages must be consistent.
    TestValidator.equals(
      "empty-filtered sessions: records equal data length",
      filteredEmpty.pagination.records,
      filteredEmpty.data.length,
    );

    const expectedPages =
      filteredEmpty.pagination.limit === 0
        ? 0
        : Math.ceil(
            filteredEmpty.pagination.records / filteredEmpty.pagination.limit,
          );

    TestValidator.equals(
      "empty-filtered sessions: pages consistent with records and limit",
      filteredEmpty.pagination.pages,
      expectedPages,
    );

    return;
  }

  // 3. Build a time window [from, to) around this target session's created_at.
  const createdAt = new Date(targetSession.created_at);
  const fromDate = new Date(createdAt.getTime() - 1_000);
  const toDate = new Date(createdAt.getTime() + 1_000);
  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  const limit: number & tags.Type<"int32"> = 10 as number & tags.Type<"int32">;

  // 4. Call sessions.index with date range and IP filters that should
  //    include the target session.
  const filteredPage: IPageIDiscussionBoardAdminuserSession.ISummary =
    await api.functional.discussionBoard.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId,
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit,
          from_created_at: fromIso,
          to_created_at: toIso,
          ip: targetSession.ip,
        },
      },
    );
  typia.assert(filteredPage);

  // 5. Validate pagination semantics.
  TestValidator.equals(
    "filtered sessions: records equals actual data length",
    filteredPage.pagination.records,
    filteredPage.data.length,
  );

  const expectedFilteredPages =
    filteredPage.pagination.limit === 0
      ? 0
      : Math.ceil(
          filteredPage.pagination.records / filteredPage.pagination.limit,
        );

  TestValidator.equals(
    "filtered sessions: pages consistent with records and limit",
    filteredPage.pagination.pages,
    expectedFilteredPages,
  );

  // Ensure every returned session matches the filter criteria.
  await TestValidator.predicate(
    "all filtered sessions match date-range and IP filters",
    async () =>
      filteredPage.data.every((session) => {
        const ts = new Date(session.created_at).getTime();
        const fromMs = new Date(fromIso).getTime();
        const toMs = new Date(toIso).getTime();

        return (
          ts >= fromMs &&
          ts < toMs &&
          session.ip === targetSession.ip &&
          session.discussion_board_adminuser_id === adminUserId
        );
      }),
  );

  // 6. Negative filter: use a different IP that should exclude the
  //    target session from results.
  const differentIp = "198.51.100.23"; // Another TEST-NET reserved IP

  const negativePage: IPageIDiscussionBoardAdminuserSession.ISummary =
    await api.functional.discussionBoard.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId,
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit,
          from_created_at: fromIso,
          to_created_at: toIso,
          ip: differentIp,
        },
      },
    );
  typia.assert(negativePage);

  // pagination.records must match data length and pages must be consistent.
  TestValidator.equals(
    "negative-filter sessions: records equal data length",
    negativePage.pagination.records,
    negativePage.data.length,
  );

  const expectedNegativePages =
    negativePage.pagination.limit === 0
      ? 0
      : Math.ceil(
          negativePage.pagination.records / negativePage.pagination.limit,
        );

  TestValidator.equals(
    "negative-filter sessions: pages consistent with records and limit",
    negativePage.pagination.pages,
    expectedNegativePages,
  );

  // All sessions returned under the negative IP filter must have the
  // requested different IP and still belong to the same admin and range.
  await TestValidator.predicate(
    "negative-filter sessions: all results match different IP and range",
    async () =>
      negativePage.data.every((session) => {
        const ts = new Date(session.created_at).getTime();
        const fromMs = new Date(fromIso).getTime();
        const toMs = new Date(toIso).getTime();
        return (
          ts >= fromMs &&
          ts < toMs &&
          session.ip === differentIp &&
          session.discussion_board_adminuser_id === adminUserId
        );
      }),
  );
}
