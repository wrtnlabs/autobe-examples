import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

/**
 * Test authenticated administrator access and advanced filtering on the
 * moderation audit log endpoint.
 *
 * 1. Register and login as a new administrator.
 * 2. Perform basic and advanced audit log queries as admin: a. No filter (retrieve
 *    some audit logs, validate structure/pagination). b. Filter by event_type
 *    (if available in results). c. Filter by actor_administrator_id (current
 *    admin), actor_moderator_id, or report_id (pick from available data if
 *    possible). d. Pagination checks with different page/limit. e. Non-matching
 *    filters (should get empty set, pages all 0).
 * 3. Perform the same endpoint call with a non-admin/unauthenticated connection
 *    and confirm access denial.
 */
export async function test_api_moderation_audit_log_list_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register a unique admin and login (this also sets admin token for connection).
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);
  TestValidator.equals(
    "administrator email returned matches input",
    admin.email,
    adminEmail,
  );

  // 2. Query moderationAuditLogs endpoint as admin (basic fetch, non-filtered).
  const logsPage =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(logsPage);
  TestValidator.predicate(
    "pagination structure has current >= 0",
    logsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit >= 0",
    logsPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records >= 0",
    logsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages >= 0",
    logsPage.pagination.pages >= 0,
  );

  // Allow tests to proceed if there are audit logs; otherwise, only empty/non-matching scenarios can be checked.
  if (logsPage.data.length > 0) {
    // a. Check filter by event_type for an event type in the result.
    const firstEventType = logsPage.data[0].event_type;
    const filteredByEventType =
      await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
        connection,
        {
          body: {
            event_type: firstEventType,
          } satisfies ICommunityPlatformModerationAuditLog.IRequest,
        },
      );
    typia.assert(filteredByEventType);
    TestValidator.predicate(
      "all returned logs match filtered event_type",
      filteredByEventType.data.every(
        (log) => log.event_type === firstEventType,
      ),
    );

    // b. Check filter by actor_administrator_id (current admin).
    const filteredByAdminId =
      await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
        connection,
        {
          body: {
            actor_administrator_id: admin.id,
          } satisfies ICommunityPlatformModerationAuditLog.IRequest,
        },
      );
    typia.assert(filteredByAdminId);
    TestValidator.predicate(
      "all logs have correct actor_administrator_id",
      filteredByAdminId.data.every(
        (log) =>
          log.actor_administrator && log.actor_administrator.id === admin.id,
      ) || filteredByAdminId.data.length === 0,
    );

    // c. Filter by created_at_start/created_at_end (narrow to a single record window if possible)
    const sampleLog = logsPage.data[0];
    const filteredByDate =
      await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
        connection,
        {
          body: {
            created_at_start: sampleLog.created_at,
            created_at_end: sampleLog.created_at,
          } satisfies ICommunityPlatformModerationAuditLog.IRequest,
        },
      );
    typia.assert(filteredByDate);
    TestValidator.predicate(
      "filtered logs created_at match expected",
      filteredByDate.data.every(
        (log) => log.created_at === sampleLog.created_at,
      ) || filteredByDate.data.length === 0,
    );

    // d. Pagination edge case: use a high page number and expect empty data.
    const bigPage =
      await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
        connection,
        {
          body: {
            page: 9999 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          } satisfies ICommunityPlatformModerationAuditLog.IRequest,
        },
      );
    typia.assert(bigPage);
    TestValidator.equals(
      "empty result for out-of-bounds page",
      bigPage.data.length,
      0,
    );
  } else {
    // There are no audit logs. Test only empty search and confirm empty result on various filters.
    const filtered =
      await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
        connection,
        {
          body: {
            event_type: RandomGenerator.alphabets(16),
          } satisfies ICommunityPlatformModerationAuditLog.IRequest,
        },
      );
    typia.assert(filtered);
    TestValidator.equals(
      "no audit logs found for random event_type",
      filtered.data.length,
      0,
    );
  }

  // 3. Check: non-admin/unauthenticated user cannot access logs.
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin or unauthenticated connection forbidden",
    async () => {
      await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
        unauthConn,
        {
          body: {} satisfies ICommunityPlatformModerationAuditLog.IRequest,
        },
      );
    },
  );
}
