import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportStatus";

/**
 * Validates the deletion workflow of a report status by an admin user.
 *
 * This test covers the entire lifecycle from admin registration and login, to
 * creation of a report status, successful deletion, and verification that
 * deletion is permanent by asserting that re-deletion fails.
 *
 * It ensures:
 *
 * - Admin role enforcement for deletion
 * - Proper deletion and system stability
 * - Error handling on repeated deletion attempts
 */
export async function test_api_report_status_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration (join)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin login
  const loginResult: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
      } satisfies IRedditCommunityAdmin.ILogin,
    });
  typia.assert(loginResult);

  // 3. Create a report status
  const createBody = {
    name: "pending_review",
    description: "Status indicating report is awaiting review",
  } satisfies IRedditCommunityReportStatus.ICreate;
  const createdStatus: IRedditCommunityReportStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdStatus);

  // 4. Delete the created report status
  await api.functional.redditCommunity.admin.reportStatuses.erase(connection, {
    statusId: createdStatus.id,
  });

  // 5. Validate deletion is permanent:
  // Trying to delete again should fail
  await TestValidator.error(
    "deleting already deleted report status should fail",
    async () => {
      await api.functional.redditCommunity.admin.reportStatuses.erase(
        connection,
        {
          statusId: createdStatus.id,
        },
      );
    },
  );
}
