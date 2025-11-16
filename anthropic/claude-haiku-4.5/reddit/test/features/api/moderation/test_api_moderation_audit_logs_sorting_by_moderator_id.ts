import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

export async function test_api_moderation_audit_logs_sorting_by_moderator_id(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator authenticated",
    administrator.id !== null && administrator.id !== undefined,
  );

  // Step 2: Query audit logs sorted by moderator_id
  const auditLogsResponse: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "moderator_id",
          order: "asc",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsResponse);

  // Step 3: Verify pagination information
  TestValidator.predicate(
    "pagination has valid structure",
    auditLogsResponse.pagination !== null &&
      auditLogsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is at least 1",
    auditLogsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    auditLogsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records count is valid",
    auditLogsResponse.pagination.records >= 0,
  );

  // Step 4: Verify data array exists
  TestValidator.predicate(
    "data array is present",
    Array.isArray(auditLogsResponse.data),
  );

  // Step 5: If there are audit logs, verify they are sorted by moderator_id
  if (auditLogsResponse.data.length > 0) {
    let previousModeratorId: string | null = null;

    for (const log of auditLogsResponse.data) {
      typia.assert(log);

      // Verify required audit log fields
      TestValidator.predicate(
        "audit log has id",
        log.id !== null && log.id !== undefined,
      );
      TestValidator.predicate(
        "audit log has action_type",
        log.action_type !== null && log.action_type !== undefined,
      );
      TestValidator.predicate(
        "audit log has target_type",
        log.target_type !== null && log.target_type !== undefined,
      );
      TestValidator.predicate(
        "audit log has moderator information",
        log.moderator !== null && log.moderator !== undefined,
      );
      TestValidator.predicate(
        "moderator has id",
        log.moderator.id !== null && log.moderator.id !== undefined,
      );

      // Verify sorting order by comparing moderator IDs
      if (previousModeratorId !== null) {
        TestValidator.predicate(
          "moderator ids are in ascending order",
          previousModeratorId <= log.moderator.id,
        );
      }
      previousModeratorId = log.moderator.id;
    }
  }

  // Step 6: Test descending order sorting
  const auditLogsDescResponse: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "moderator_id",
          order: "desc",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsDescResponse);

  if (auditLogsDescResponse.data.length > 0) {
    let previousModeratorId: string | null = null;

    for (const log of auditLogsDescResponse.data) {
      typia.assert(log);

      // Verify descending order
      if (previousModeratorId !== null) {
        TestValidator.predicate(
          "moderator ids are in descending order",
          previousModeratorId >= log.moderator.id,
        );
      }
      previousModeratorId = log.moderator.id;
    }
  }
}
