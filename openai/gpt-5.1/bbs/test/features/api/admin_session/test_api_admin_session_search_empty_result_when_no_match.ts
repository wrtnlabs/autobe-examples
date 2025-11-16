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
 * Ensure admin session search returns an empty page when filters match no
 * sessions.
 *
 * Business goal: Verify that the admin session search endpoint for a specific
 * administrator correctly represents "no matching sessions" as an empty, but
 * successful, paginated result instead of throwing an error. This is essential
 * for monitoring and audit UIs, which must gracefully handle search filters
 * that yield zero rows.
 *
 * Scenario:
 *
 * 1. Register (join) a new adminUser via POST /auth/adminUser/join. This both
 *    creates an admin account in discussion_board_adminusers and establishes an
 *    authenticated session with an Authorization header managed by the SDK.
 * 2. Use the returned adminUser id as the path parameter adminUserId when calling
 *    PATCH /discussionBoard/adminUser/adminUsers/{adminUserId}/sessions.
 * 3. For the join request, send a specific combination of ip, href, and referrer
 *    values so that we know exactly what the first session context looks like.
 * 4. For the sessions search request body
 *    (IDiscussionBoardAdminuserSession.IRequest), set page to 1, limit to 10,
 *    but deliberately choose filters that cannot match the existing session:
 *
 *    - Ip: choose a different IP from the one used in the join request.
 *    - Href: choose a different URI from the join request href.
 *    - Referrer: choose a different URI from the join request referrer. Leave
 *         from_created_at and to_created_at undefined to avoid depending on
 *         precise timestamps.
 * 5. Call api.functional.discussionBoard.adminUser.adminUsers.sessions.index with
 *    the adminUserId and the crafted IRequest body.
 * 6. Assert that the response passes typia.assert, confirming it is a valid
 *    IPageIDiscussionBoardAdminuserSession.ISummary structure.
 * 7. Use TestValidator.equals to verify:
 *
 *    - Pagination.records is 0.
 *    - Pagination.pages is 0.
 *    - Data.length is 0.
 *    - Data equals an empty array.
 * 8. Do not attempt to assert on HTTP status codes directly; rely on the fact that
 *    a successful SDK call returning a value implies a 2xx response.
 */
export async function test_api_admin_session_search_empty_result_when_no_match(
  connection: api.IConnection,
) {
  // 1. Register (join) a new admin user to obtain an authenticated context and adminUserId
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: "198.51.100.1",
    href: "https://admin.example.com/join",
    referrer: "https://www.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Build a request body for sessions search that is guaranteed to match no sessions
  const emptySearchRequest = {
    page: 1,
    limit: 10,
    // Use IP and URLs that differ from those in joinBody
    ip: "203.0.113.123",
    href: "https://admin.example.com/other-page",
    referrer: "https://www.example.com/other-entry",
  } satisfies IDiscussionBoardAdminuserSession.IRequest;

  // 3. Call the sessions search endpoint for this admin user
  const pageResult: IPageIDiscussionBoardAdminuserSession.ISummary =
    await api.functional.discussionBoard.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId: adminAuthorized.id,
        body: emptySearchRequest,
      },
    );

  // 4. Validate response type and empty pagination semantics
  typia.assert(pageResult);

  const pagination = pageResult.pagination;

  TestValidator.equals(
    "admin session search with unmatched filters returns 0 records",
    pagination.records,
    0,
  );
  TestValidator.equals(
    "admin session search with unmatched filters reports 0 pages",
    pagination.pages,
    0,
  );
  TestValidator.equals(
    "admin session search with unmatched filters returns empty data array",
    pageResult.data.length,
    0,
  );
  TestValidator.equals(
    "admin session search with unmatched filters data is exactly empty array",
    pageResult.data,
    [],
  );
}
