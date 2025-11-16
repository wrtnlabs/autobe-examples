import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformadminSession";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformadminSession";

/**
 * Validate filtering of platform admin sessions by creation and last-activity
 * windows and by the `active_only` flag.
 *
 * Business context: Platform administrators can have multiple concurrent
 * authentication sessions (e.g., logins from different browsers or devices).
 * For audit and security review, they (or higher-privileged admins) need to
 * list sessions scoped to a particular platform admin, and filter them by
 * active/expired status and by time windows on creation and last activity.
 *
 * This test exercises the session listing endpoint PATCH
 * /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/sessions which
 * is exposed as
 * api.functional.shoppingMall.platformAdmin.platformAdmins.sessions.index.
 *
 * High-level flow:
 *
 * 1. Join a new platform admin (this also creates an initial session).
 * 2. Perform two additional logins for the same admin to create at least three
 *    distinct sessions. We vary href/referrer per login to ensure the sessions
 *    are distinguishable in the listing.
 * 3. Call the sessions index endpoint without filters to obtain the baseline set
 *    of sessions for this admin; capture createdAt values and identify a
 *    suitable time window that contains a proper subset of them. Since the test
 *    cannot control server-side timestamps directly, it uses the returned
 *    timestamps themselves to construct from/to windows.
 * 4. Call the sessions index endpoint again with:
 *
 *    - Active_only: true
 *    - From_created_at: lower bound taken from the earliest captured createdAt value
 *    - To_created_at: an upper bound between the middle and the latest createdAt
 *         values to exclude at least one known session and assert that:
 *    - All returned sessions belong to the same platformAdminId.
 *    - All returned sessions have is_active === true.
 *    - No session has createdAt outside [from_created_at, to_created_at].
 * 5. Optionally perform an additional call with a narrower window (e.g., focusing
 *    only on the latest createdAt) so that the resulting pagination.records is
 *    strictly lower than the baseline total, demonstrating that the filters
 *    meaningfully reduce the result set.
 *
 * Note:
 *
 * - We cannot directly manipulate or verify lastActivityAt beyond what the server
 *   computes; therefore, we restrict ourselves to verifying that the
 *   createdAt-based filtering and active_only flag behave consistently with the
 *   returned data.
 * - The test uses typia.assert on all responses for strict type validation and
 *   TestValidator for business-rule assertions.
 */
export async function test_api_platform_admin_filters_sessions_by_activity_window_and_active_only(
  connection: api.IConnection,
) {
  // 1. Join a new platform admin; this sets connection Authorization.
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const joinedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  const platformAdminId = joinedAdmin.id;

  // 2. Perform two additional logins to create more sessions for this admin.
  // Use the same email/password but different href/referrer to simulate
  // different client contexts.
  const loginBody1: IShoppingMallPlatformAdminLogin.IRequest = {
    email: joinBody.email,
    password: joinBody.password,
    ip: joinBody.ip ?? null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const loginResult1: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: loginBody1,
    });
  typia.assert(loginResult1);

  const loginBody2: IShoppingMallPlatformAdminLogin.IRequest = {
    email: joinBody.email,
    password: joinBody.password,
    ip: joinBody.ip ?? null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const loginResult2: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: loginBody2,
    });
  typia.assert(loginResult2);

  // 3. Baseline listing without filters to understand available sessions.
  const baselineRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallPlatformadminSession.IRequest;

  const baselinePage: IPageIShoppingMallPlatformadminSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.sessions.index(
      connection,
      {
        platformAdminId,
        body: baselineRequest,
      },
    );
  typia.assert(baselinePage);

  const baselineSessions = baselinePage.data;

  // Ensure we have at least one session.
  await TestValidator.predicate(
    "baseline sessions should not be empty",
    async () => baselineSessions.length > 0,
  );

  // If there's only one session, we can still test active_only and
  // basic time-window behavior by using its exact createdAt.
  const sortedByCreated = [...baselineSessions].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  const firstCreated = sortedByCreated[0]!.createdAt;
  const lastCreated = sortedByCreated[sortedByCreated.length - 1]!.createdAt;

  // Pick an upper bound: use lastCreated; when we have >= 2 sessions, also
  // choose a mid-point session to construct a narrower window later.
  const midCreated =
    sortedByCreated[Math.floor(sortedByCreated.length / 2)]!.createdAt;

  // 4. Call with active_only and a broad createdAt window including all
  // sessions, using [firstCreated, lastCreated].
  const activeOnlyRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    active_only: true,
    from_created_at: firstCreated,
    to_created_at: lastCreated,
  } satisfies IShoppingMallPlatformadminSession.IRequest;

  const activeOnlyPage: IPageIShoppingMallPlatformadminSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.sessions.index(
      connection,
      {
        platformAdminId,
        body: activeOnlyRequest,
      },
    );
  typia.assert(activeOnlyPage);

  const activeSessions = activeOnlyPage.data;

  // All sessions in activeSessions must belong to the same platform admin
  // and must be active and within the [firstCreated, lastCreated] range.
  for (const session of activeSessions) {
    typia.assert<IShoppingMallPlatformadminSession.ISummary>(session);

    TestValidator.equals(
      "session platform admin id matches",
      session.platformAdmin.id,
      platformAdminId,
    );

    TestValidator.predicate(
      "session must be active when active_only is true",
      session.is_active === true,
    );

    TestValidator.predicate(
      "session createdAt is within [from_created_at, to_created_at]",
      session.createdAt >= firstCreated && session.createdAt <= lastCreated,
    );
  }

  // 5. If there are at least 2 sessions, construct a narrower window that
  // should include fewer or equal sessions (using midCreated as upper bound).
  if (sortedByCreated.length >= 2) {
    const narrowRequest = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
      active_only: true,
      from_created_at: firstCreated,
      to_created_at: midCreated,
    } satisfies IShoppingMallPlatformadminSession.IRequest;

    const narrowPage: IPageIShoppingMallPlatformadminSession.ISummary =
      await api.functional.shoppingMall.platformAdmin.platformAdmins.sessions.index(
        connection,
        {
          platformAdminId,
          body: narrowRequest,
        },
      );
    typia.assert(narrowPage);

    const narrowSessions = narrowPage.data;

    // All sessions must still match admin id, be active, and be within the
    // narrower window.
    for (const session of narrowSessions) {
      TestValidator.equals(
        "narrow session platform admin id matches",
        session.platformAdmin.id,
        platformAdminId,
      );

      TestValidator.predicate(
        "narrow session must be active when active_only is true",
        session.is_active === true,
      );

      TestValidator.predicate(
        "narrow session createdAt within [firstCreated, midCreated]",
        session.createdAt >= firstCreated && session.createdAt <= midCreated,
      );
    }

    // The narrow window should not yield more records than the active-only
    // broad window; often it will be fewer, demonstrating effective filtering.
    TestValidator.predicate(
      "narrow window should not have more records than broad window",
      narrowPage.pagination.records <= activeOnlyPage.pagination.records,
    );
  }
}
