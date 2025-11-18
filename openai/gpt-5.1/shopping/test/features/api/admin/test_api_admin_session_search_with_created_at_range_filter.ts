import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Validate admin session search filtered by created_at range.
 *
 * Business goal: Ensure that an authenticated admin can retrieve only their own
 * admin sessions and filter them by a created_at date-time range using the
 * created_from and created_to fields in IShoppingMallAdminSession.IRequest when
 * calling PATCH /shoppingMall/admin/admins/{adminId}/sessions.
 *
 * Step-by-step process:
 *
 * 1. Register a new admin with POST /auth/admin/join. This both creates the admin
 *    record and an initial session.
 * 2. Perform several additional logins with POST /auth/admin/login to generate
 *    multiple sessions for the same admin.
 * 3. Call PATCH /shoppingMall/admin/admins/{adminId}/sessions without
 *    created_from/created_to to obtain a full list of this admin’s sessions
 *    (ground truth) and sort them by created_at.
 * 4. Choose a middle-inclusive range [created_from, created_to] from the
 *    ground-truth sessions using their created_at timestamps.
 * 5. Call the same sessions index endpoint again with created_from and created_to
 *    set to this range and a fixed pagination configuration.
 * 6. Verify that all returned sessions:
 *
 *    - Belong to the registered admin, and
 *    - Have created_at within the inclusive range.
 * 7. Confirm that at least one known session outside the range is not returned
 *    when such sessions exist.
 * 8. Validate pagination metadata (current page, limit, records, pages) for
 *    logical consistency with the request and returned data.
 *
 * This test focuses on business logic and data relationships only, and does not
 * attempt any type-error or HTTP-status specific testing.
 */
export async function test_api_admin_session_search_with_created_at_range_filter(
  connection: api.IConnection,
) {
  // 1. Register a new admin and get initial authorized context (includes token)
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  const adminId = authorized.id;
  const adminEmail = authorized.email;
  const adminPassword = joinBody.password;

  // 2. Generate additional sessions by logging in multiple times
  const loginCount = 4;
  for (let i = 0; i < loginCount; i++) {
    const loginBody = {
      email: adminEmail,
      password: adminPassword,
      ip: joinBody.ip ?? null,
      href: joinBody.href,
      referrer: joinBody.referrer,
    } satisfies IShoppingMallAdminLogin.ICreate;

    const loginResult: IShoppingMallAdmin.IAuthorized =
      await api.functional.auth.admin.login(connection, {
        body: loginBody,
      });
    typia.assert<IShoppingMallAdmin.IAuthorized>(loginResult);
  }

  // 3. Fetch all sessions for this admin (unfiltered) to get ground truth
  const baseRequest = {
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_direction: "asc",
  } satisfies IShoppingMallAdminSession.IRequest;

  const allSessionsPage: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId,
      body: baseRequest,
    });
  typia.assert<IPageIShoppingMallAdminSession.ISummary>(allSessionsPage);

  const allSessions = allSessionsPage.data;
  TestValidator.predicate(
    "there should be at least 3 sessions for range filtering",
    allSessions.length >= 3,
  );

  // Sort by created_at ascending for deterministic range logic
  const sortedSessions = [...allSessions].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  const firstSession = sortedSessions[0];
  const middleSession = sortedSessions[Math.floor(sortedSessions.length / 2)];
  const lastSession = sortedSessions[sortedSessions.length - 1];
  void firstSession; // firstSession is used only for conceptual clarity

  // Define inclusive range using a middle subset: [middle.created_at, last.created_at]
  const createdFrom = middleSession.created_at;
  const createdTo = lastSession.created_at;

  const rangeRequest = {
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_direction: "asc",
    created_from: createdFrom,
    created_to: createdTo,
  } satisfies IShoppingMallAdminSession.IRequest;

  const rangedPage: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId,
      body: rangeRequest,
    });
  typia.assert<IPageIShoppingMallAdminSession.ISummary>(rangedPage);

  const rangedSessions = rangedPage.data;

  // 4. Validate all returned sessions belong to the admin and fall within range
  for (const session of rangedSessions) {
    // Admin summary consistency
    TestValidator.equals(
      "session admin id must match registered admin",
      session.admin.id,
      adminId,
    );

    const createdAtTime = new Date(session.created_at).getTime();
    const fromTime = new Date(createdFrom).getTime();
    const toTime = new Date(createdTo).getTime();

    TestValidator.predicate(
      "session created_at must be greater than or equal to created_from",
      createdAtTime >= fromTime,
    );
    TestValidator.predicate(
      "session created_at must be less than or equal to created_to",
      createdAtTime <= toTime,
    );
  }

  // 5. Ensure we excluded at least one session outside the range if possible
  const inRangeIds = new Set(rangedSessions.map((s) => s.id));

  const fromTime = new Date(createdFrom).getTime();
  const toTime = new Date(createdTo).getTime();

  const earlierSessions = sortedSessions.filter(
    (s) => new Date(s.created_at).getTime() < fromTime,
  );
  const laterSessions = sortedSessions.filter(
    (s) => new Date(s.created_at).getTime() > toTime,
  );

  if (earlierSessions.length > 0) {
    const earliest = earlierSessions[0];
    TestValidator.predicate(
      "earliest session before range should not be in filtered results",
      inRangeIds.has(earliest.id) === false,
    );
  }

  if (laterSessions.length > 0) {
    const latest = laterSessions[laterSessions.length - 1];
    TestValidator.predicate(
      "latest session after range should not be in filtered results",
      inRangeIds.has(latest.id) === false,
    );
  }

  // 6. Validate pagination metadata consistency with requested page/limit
  const pagination = rangedPage.pagination;
  TestValidator.equals(
    "pagination current page must equal requested page",
    pagination.current,
    rangeRequest.page ?? 1,
  );
  TestValidator.equals(
    "pagination limit must equal requested limit",
    pagination.limit,
    rangeRequest.limit ?? 0,
  );
  TestValidator.predicate(
    "pagination records must be at least number of returned sessions",
    pagination.records >= rangedSessions.length,
  );
  TestValidator.predicate(
    "pagination pages must be at least 1 when there is any record",
    pagination.pages >= (pagination.records > 0 ? 1 : 0),
  );
}
