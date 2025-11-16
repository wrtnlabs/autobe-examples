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
 * Verify that admin session search is forbidden without authentication.
 *
 * Business goals:
 *
 * - Ensure that PATCH
 *   /discussionBoard/adminUser/adminUsers/{adminUserId}/sessions cannot be
 *   accessed without a valid adminUser authentication token.
 * - Confirm that the same endpoint works when called with a properly
 *   authenticated adminUser connection and returns well-typed data.
 *
 * Test steps:
 *
 * 1. Create a dedicated connection for adminUser authentication (authConn).
 * 2. Call api.functional.auth.adminUser.join(authConn, { body }) to register a new
 *    admin user and obtain a valid adminUserId and token.
 * 3. Build an unauthenticated connection (unauthConn) that has no headers,
 *    ensuring it carries no Authorization information.
 * 4. With unauthConn, call
 *    api.functional.discussionBoard.adminUser.adminUsers.sessions.index using
 *    the real adminUserId and a minimal valid search body, and assert via
 *    TestValidator.error that the call fails (unauthorized/forbidden).
 * 5. As a positive control, call the same sessions.index endpoint using the
 *    authenticated authConn and verify it succeeds and returns
 *    IPageIDiscussionBoardAdminuserSession.ISummary, validating it with
 *    typia.assert and basic business checks.
 */
export async function test_api_admin_session_search_forbidden_without_auth(
  connection: api.IConnection,
) {
  // 1. Prepare a dedicated authenticated admin connection so we don't
  //    accidentally reuse its headers when simulating unauthenticated calls.
  const authConn: api.IConnection = {
    host: connection.host,
    headers: {},
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };

  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(authConn, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Build an unauthenticated connection that has no headers at all.
  const unauthConn: api.IConnection = {
    host: connection.host,
    headers: {},
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };

  const searchBody = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IDiscussionBoardAdminuserSession.IRequest;

  // 3. Unauthenticated call must fail.
  await TestValidator.error(
    "unauthenticated admin session search must be rejected",
    async () => {
      await api.functional.discussionBoard.adminUser.adminUsers.sessions.index(
        unauthConn,
        {
          adminUserId: adminAuthorized.id,
          body: searchBody,
        },
      );
    },
  );

  // 4. Authenticated call using authConn must succeed.
  const page: IPageIDiscussionBoardAdminuserSession.ISummary =
    await api.functional.discussionBoard.adminUser.adminUsers.sessions.index(
      authConn,
      {
        adminUserId: adminAuthorized.id,
        body: searchBody,
      },
    );
  typia.assert(page);

  // Basic business checks on pagination.
  TestValidator.predicate(
    "pagination current page index must be non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit must be non-negative",
    page.pagination.limit >= 0,
  );

  // If any sessions are returned, they must belong to the same admin user.
  for (const session of page.data) {
    typia.assert<IDiscussionBoardAdminuserSession.ISummary>(session);
    TestValidator.equals(
      "session adminUser id must match created admin user id",
      session.adminUser.id,
      adminAuthorized.id,
    );
  }
}
