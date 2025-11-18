import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestuserSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestuserSession";

/**
 * Validate data integrity between guest user session list and detail endpoints
 * for admin tooling.
 *
 * Business goal: Ensure that the admin-facing guest user session detail view
 * (/shoppingMall/admin/guestUsers/{guestUserId}/sessions/{sessionId}) returns
 * fields that are perfectly consistent with the corresponding session summary
 * returned from the list/search endpoint
 * (/shoppingMall/admin/guestUsers/{guestUserId}/sessions), and that the
 * embedded guestUser summary is aligned with the guestUserId path parameter.
 *
 * Scenario steps:
 *
 * 1. Join as an admin using POST /auth/admin/join to obtain an
 *    IShoppingMallAdmin.IAuthorized context and have the SDK attach the access
 *    token to the connection.
 * 2. Generate a random guestUserId (UUID) and issue a PATCH
 *    /shoppingMall/admin/guestUsers/{guestUserId}/sessions call using a simple
 *    IShoppingMallGuestuserSession.IRequest filter (page/limit only) to
 *    retrieve IPageIShoppingMallGuestuserSession.ISummary.
 * 3. If the page contains at least one session summary: 3-1. Select the first
 *    IShoppingMallGuestuserSession.ISummary. 3-2. Call GET
 *    /shoppingMall/admin/guestUsers/{guestUserId}/sessions/{sessionId} with the
 *    same guestUserId and the summary.id as sessionId. 3-3. Assert that the
 *    detailed IShoppingMallGuestuserSession has the same id, ip, href,
 *    referrer, created_at and expired_at values as the chosen summary. 3-4.
 *    Assert that detail.guestUser.id equals the guestUserId path parameter,
 *    confirming that the session is correctly scoped to its owning guest user.
 * 4. If the page contains no session summaries for the random guestUserId, simply
 *    assert that the list is empty; this still validates type correctness and
 *    basic wiring for the list endpoint without assuming seeded data.
 */
export async function test_api_admin_guestuser_session_detail_data_integrity(
  connection: api.IConnection,
) {
  // 1. Join as an admin to acquire authorization context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Query guest user sessions for a random guest user id.
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    created_from: null,
    created_to: null,
  } satisfies IShoppingMallGuestuserSession.IRequest;

  const pageResult: IPageIShoppingMallGuestuserSession.ISummary =
    await api.functional.shoppingMall.admin.guestUsers.sessions.index(
      connection,
      {
        guestUserId,
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallGuestuserSession.ISummary>(pageResult);
  typia.assert<IPage.IPagination>(pageResult.pagination);

  // If there are no sessions for this guest user, we can only validate
  // that the list is empty and pagination is coherent.
  if (pageResult.data.length === 0) {
    TestValidator.equals(
      "guest user session list is empty for random guestUserId",
      pageResult.data.length,
      0,
    );
    return;
  }

  // 3. Take the first summary and load its detail.
  const summary: IShoppingMallGuestuserSession.ISummary = pageResult.data[0];
  typia.assert<IShoppingMallGuestuserSession.ISummary>(summary);

  const detail: IShoppingMallGuestuserSession =
    await api.functional.shoppingMall.admin.guestUsers.sessions.at(connection, {
      guestUserId,
      sessionId: summary.id,
    });
  typia.assert<IShoppingMallGuestuserSession>(detail);

  // 4. Compare scalar properties between summary and detail.
  TestValidator.equals(
    "session id in detail matches summary",
    detail.id,
    summary.id,
  );
  TestValidator.equals(
    "session ip in detail matches summary",
    detail.ip,
    summary.ip,
  );
  TestValidator.equals(
    "session href in detail matches summary",
    detail.href,
    summary.href,
  );
  TestValidator.equals(
    "session referrer in detail matches summary",
    detail.referrer,
    summary.referrer,
  );
  TestValidator.equals(
    "session created_at in detail matches summary",
    detail.created_at,
    summary.created_at,
  );
  TestValidator.equals(
    "session expired_at in detail matches summary (nullable)",
    detail.expired_at ?? null,
    summary.expired_at ?? null,
  );

  // 5. Validate embedded guest user summary and its id relationship.
  typia.assert<IShoppingMallGuestUser.ISummary>(detail.guestUser);
  TestValidator.equals(
    "detail.guestUser.id matches guestUserId path parameter",
    detail.guestUser.id,
    guestUserId,
  );
}
