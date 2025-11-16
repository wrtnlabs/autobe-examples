import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate the administrator's ability to soft-delete a report.
 *
 * 1. Register an administrator to obtain authentication.
 * 2. Generate a valid UUID to use as a reportId (since we can't create a report
 *    via available API directly).
 * 3. Attempt soft-deletion (erase) as administrator (expect deleted_at set and
 *    returned).
 * 4. Attempt soft-deletion again of already deleted report (expect error).
 * 5. Attempt soft-deletion without authentication (expect error).
 */
export async function test_api_report_soft_delete_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register a new administrator
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // 2. Generate a reportId (valid UUID)
  const reportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Soft-delete as authorized admin
  const deletedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.administrator.reports.erase(
      connection,
      { reportId },
    );
  typia.assert(deletedReport);
  TestValidator.predicate(
    "deleted_at should be set",
    deletedReport.deleted_at !== null && deletedReport.deleted_at !== undefined,
  );

  // 4. Soft-delete again (should error)
  await TestValidator.error(
    "deleting already soft-deleted report should fail",
    async () => {
      await api.functional.communityPlatform.administrator.reports.erase(
        connection,
        { reportId },
      );
    },
  );

  // 5. Soft-delete without authentication (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated soft-delete should fail",
    async () => {
      await api.functional.communityPlatform.administrator.reports.erase(
        unauthConn,
        { reportId },
      );
    },
  );
}
