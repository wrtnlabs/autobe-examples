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

/**
 * Test sorting of moderation audit logs by creation timestamp.
 *
 * Validates that the API correctly sorts audit logs in both ascending (oldest
 * first) and descending (newest first) order based on the created_at timestamp.
 * This ensures chronological ordering of audit trails for compliance and
 * investigation.
 *
 * Test flow:
 *
 * 1. Authenticate as administrator to gain access to audit logs
 * 2. Query audit logs sorted by created_at in ascending order (oldest entries
 *    first)
 * 3. Verify the ascending order is correct (created_at values increase)
 * 4. Query audit logs sorted by created_at in descending order (newest entries
 *    first)
 * 5. Verify the descending order is correct (created_at values decrease)
 * 6. Confirm that sort_by and order parameters properly control result ordering
 */
export async function test_api_moderation_audit_logs_sorting_by_created_at(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Query audit logs sorted in ascending order (oldest first)
  const ascendingResult: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "asc",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Verify ascending order - each entry's created_at should be >= previous entry
  if (ascendingResult.data.length > 1) {
    for (let i = 1; i < ascendingResult.data.length; i++) {
      const prevTimestamp = new Date(
        ascendingResult.data[i - 1].created_at,
      ).getTime();
      const currentTimestamp = new Date(
        ascendingResult.data[i].created_at,
      ).getTime();
      TestValidator.predicate(
        "audit logs in ascending order by created_at",
        prevTimestamp <= currentTimestamp,
      );
    }
  }

  // 3. Query audit logs sorted in descending order (newest first)
  const descendingResult: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Verify descending order - each entry's created_at should be <= previous entry
  if (descendingResult.data.length > 1) {
    for (let i = 1; i < descendingResult.data.length; i++) {
      const prevTimestamp = new Date(
        descendingResult.data[i - 1].created_at,
      ).getTime();
      const currentTimestamp = new Date(
        descendingResult.data[i].created_at,
      ).getTime();
      TestValidator.predicate(
        "audit logs in descending order by created_at",
        prevTimestamp >= currentTimestamp,
      );
    }
  }

  // Verify that both queries return the same audit logs (just in different order)
  TestValidator.equals(
    "ascending and descending results contain same number of logs",
    ascendingResult.data.length,
    descendingResult.data.length,
  );

  // Verify that first item in ascending is last item in descending (if data exists)
  if (ascendingResult.data.length > 0 && descendingResult.data.length > 0) {
    TestValidator.equals(
      "first ascending entry matches last descending entry",
      ascendingResult.data[0].id,
      descendingResult.data[descendingResult.data.length - 1].id,
    );

    TestValidator.equals(
      "last ascending entry matches first descending entry",
      ascendingResult.data[ascendingResult.data.length - 1].id,
      descendingResult.data[0].id,
    );
  }
}
