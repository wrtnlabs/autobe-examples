import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuditLog";

/**
 * Validate filtering of admin audit logs by actor and created_at time window.
 *
 * Business scenario:
 *
 * - An administrative actor (adminUser) joins the platform and performs at least
 *   one privileged operation (creating a system configuration entry).
 * - The audit log search endpoint is then used to retrieve only those audit
 *   entries attributed to this admin within a specific time window.
 * - Narrowing the time window to a distant past range should yield an empty
 *   result set while still returning a valid pagination structure.
 *
 * Step-by-step workflow:
 *
 * 1. Join an adminUser via POST /auth/adminUser/join and capture the returned
 *    ICommunityPlatformAdminuser.IAuthorized, including its id and token.
 * 2. With this authenticated admin context, create a
 *    ICommunityPlatformSystemConfig entry via POST
 *    /communityPlatform/adminUser/systemConfigs to ensure at least one
 *    admin-originated operation is recorded in the audit log.
 * 3. Build an ICommunityPlatformAuditLog.IRequest body that filters by actor_type
 *    = "adminUser", actor_key = the joined admin id, and a created_at_from/to
 *    window that should encompass the recent operations, along with reasonable
 *    pagination and sorting options.
 * 4. Call PATCH /communityPlatform/adminUser/auditLogs and assert that the
 *    returned IPageICommunityPlatformAuditLog.ISummary is structurally valid
 *    and that every ICommunityPlatformAuditLog.ISummary in data has actor_type
 *    = "adminUser" and a created_at timestamp lying within the requested time
 *    window. When actor_key is present, confirm it matches the admin id.
 * 5. Issue a second search request with a time window in the distant past that
 *    should contain no events for this admin, and assert that the result set is
 *    empty while pagination metadata remains valid.
 */
export async function test_api_admin_audit_logs_filter_by_actor_and_time_range(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and obtain authorized context (includes JWT)
  const joinBody = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create at least one system configuration as this admin to generate audit logs
  const systemConfigBody =
    typia.random<ICommunityPlatformSystemConfig.ICreate>();
  const systemConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: systemConfigBody,
      },
    );
  typia.assert(systemConfig);

  // 3. Define a created_at time window expected to include the above actions
  const now = new Date();
  const fromDate = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
  const toDate = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes ahead

  const requestBody = {
    actor_type: "adminUser",
    actor_key: admin.id,
    created_at_from: fromDate.toISOString(),
    created_at_to: toDate.toISOString(),
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformAuditLog.IRequest;

  // 4. Call auditLogs.index with the time-bounded, actor-filtered request
  const page: IPageICommunityPlatformAuditLog.ISummary =
    await api.functional.communityPlatform.adminUser.auditLogs.index(
      connection,
      { body: requestBody },
    );
  typia.assert(page);

  // 5. Validate that all returned entries match actor and time window filters
  const pagination: IPage.IPagination = page.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "pagination current page is either zero (no data) or matches requested page",
    () =>
      pagination.current === 0 ||
      pagination.current === (requestBody.page ?? 1),
  );

  TestValidator.predicate(
    "pagination limit is non-negative and typically follows requested limit",
    () => pagination.limit >= 0,
  );

  for (const log of page.data) {
    typia.assert<ICommunityPlatformAuditLog.ISummary>(log);

    TestValidator.equals(
      "audit log actor_type should be adminUser",
      log.actor_type,
      "adminUser",
    );

    if (log.actor_key !== null && log.actor_key !== undefined) {
      TestValidator.equals(
        "audit log actor_key should match admin id when present",
        log.actor_key,
        admin.id,
      );
    }

    const createdAt = new Date(log.created_at).getTime();
    const fromMillis = fromDate.getTime();
    const toMillis = toDate.getTime();

    TestValidator.predicate(
      "audit log created_at lies within requested time window (inclusive)",
      () => createdAt >= fromMillis && createdAt <= toMillis,
    );
  }

  // 6. Narrow the time window to exclude known events and expect empty result set
  const pastFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  const pastTo = new Date(now.getTime() - 23 * 60 * 60 * 1000); // 23 hours ago

  const pastRequestBody = {
    actor_type: "adminUser",
    actor_key: admin.id,
    created_at_from: pastFrom.toISOString(),
    created_at_to: pastTo.toISOString(),
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformAuditLog.IRequest;

  const pastPage: IPageICommunityPlatformAuditLog.ISummary =
    await api.functional.communityPlatform.adminUser.auditLogs.index(
      connection,
      { body: pastRequestBody },
    );
  typia.assert(pastPage);
  typia.assert(pastPage.pagination);

  TestValidator.equals(
    "narrowed time window should return zero audit records for this admin",
    pastPage.data.length,
    0,
  );
}
