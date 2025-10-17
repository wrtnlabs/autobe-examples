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
 * This test verifies that an admin user can create a new report status entity
 * within the redditCommunity platform. It covers successful creation with valid
 * unique names and optional descriptions. The test includes registering a new
 * admin user, authenticating, creating the report status, validating the
 * response, and checking error handling for duplicate names.
 *
 * Steps:
 *
 * 1. Admin registration via /auth/admin/join with unique email and password.
 * 2. Assert admin authorization and JWT token issuance.
 * 3. Create a report status with a unique name and optional description.
 * 4. Validate the created report status is returned with expected properties.
 * 5. Attempt a duplicate report status creation to verify proper error handling.
 */
export async function test_api_report_status_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "ComplexPass123!";
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Validate authorization details and token
  TestValidator.predicate(
    "admin authorization includes token",
    admin.token !== null && admin.token !== undefined,
  );
  TestValidator.predicate(
    "admin email matches registration",
    admin.email === adminEmail,
  );

  // 3. Create a unique report status
  const statusName = `pending_${RandomGenerator.alphaNumeric(6)}`;
  const statusDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });

  const reportStatusCreateBody = {
    name: statusName,
    description: statusDescription,
  } satisfies IRedditCommunityReportStatus.ICreate;

  const reportStatus: IRedditCommunityReportStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      {
        body: reportStatusCreateBody,
      },
    );
  typia.assert(reportStatus);

  // 4. Validate returned report status
  TestValidator.equals(
    "report status name matches",
    reportStatus.name,
    statusName,
  );
  TestValidator.equals(
    "report status description matches",
    reportStatus.description ?? null,
    statusDescription,
  );

  // 5. Attempt to create a duplicate report status to check duplicate handling
  await TestValidator.error(
    "duplicate report status name should fail",
    async () => {
      await api.functional.redditCommunity.admin.reportStatuses.create(
        connection,
        {
          body: reportStatusCreateBody,
        },
      );
    },
  );
}
