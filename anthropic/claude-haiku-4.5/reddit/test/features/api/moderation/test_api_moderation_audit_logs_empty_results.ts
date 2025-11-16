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

export async function test_api_moderation_audit_logs_empty_results(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Query audit logs with filters that match no entries (non-existent action_type)
  const emptyResultsByActionType: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_type: "remove_post",
          created_at_from: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(emptyResultsByActionType);

  // 3. Validate empty data array
  TestValidator.equals(
    "audit logs data should be empty array",
    emptyResultsByActionType.data,
    [],
  );

  // 4. Validate pagination metadata for empty results
  TestValidator.equals(
    "pagination current page should be 0",
    emptyResultsByActionType.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0",
    emptyResultsByActionType.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    emptyResultsByActionType.pagination.pages,
    0,
  );

  // 5. Query with another filter combination that returns empty results (far future date)
  const emptyResultsByDate: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          created_at_from: new Date(
            Date.now() + 730 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          limit: 50,
          page: 1,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(emptyResultsByDate);

  // 6. Validate empty results from date filtering
  TestValidator.equals(
    "audit logs with future date filter should be empty",
    emptyResultsByDate.data,
    [],
  );
  TestValidator.predicate(
    "pagination should show zero records for future date query",
    emptyResultsByDate.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination should show zero pages for future date query",
    emptyResultsByDate.pagination.pages === 0,
  );

  // 7. Query with non-existent moderator ID filter
  const emptyResultsByModerator: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          moderator_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(emptyResultsByModerator);

  // 8. Validate empty results from moderator filter
  TestValidator.equals(
    "audit logs with non-existent moderator should be empty",
    emptyResultsByModerator.data.length,
    0,
  );
}
