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
 * Test retrieval of detailed information of a specific redditCommunity report
 * status by its unique identifier.
 *
 * This test includes:
 *
 * 1. Authenticating as an admin user via the join API.
 * 2. Creating a report status with unique name and optional description.
 * 3. Retrieving the created report status by its ID without authentication.
 * 4. Verifying the retrieved data matches the created report status.
 * 5. Verifying errors are thrown when retrieving using an invalid UUID and for
 *    non-existent IDs.
 *
 * All API responses are validated using typia.assert. TestValidator functions
 * are used with descriptive titles for assertions and error handling.
 */
export async function test_api_report_status_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Admin user registration (join)
  const adminCreateBody = {
    email: `${RandomGenerator.alphaNumeric(5)}@test.com`,
    password: "Password123!",
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 2. Create a new report status
  const statusCreateBody = {
    name: `${RandomGenerator.alphaNumeric(6)}_status`,
    description: "Status description for testing retrieval",
  } satisfies IRedditCommunityReportStatus.ICreate;
  const createdStatus: IRedditCommunityReportStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      { body: statusCreateBody },
    );
  typia.assert(createdStatus);

  // 3. Retrieve the created report status by its ID
  const retrievedStatus: IRedditCommunityReportStatus =
    await api.functional.redditCommunity.reportStatuses.at(connection, {
      statusId: createdStatus.id,
    });
  typia.assert(retrievedStatus);

  // 4. Validate that the retrieved status matches the created one
  TestValidator.equals(
    "Retrieved report status ID matches created",
    retrievedStatus.id,
    createdStatus.id,
  );
  TestValidator.equals(
    "Retrieved report status name matches created",
    retrievedStatus.name,
    createdStatus.name,
  );
  TestValidator.equals(
    "Retrieved report status description matches created",
    retrievedStatus.description,
    createdStatus.description,
  );

  // 5. Test error for invalid UUID format
  await TestValidator.error(
    "Retrieval with invalid UUID format should fail",
    async () => {
      await api.functional.redditCommunity.reportStatuses.at(connection, {
        statusId: "invalid-uuid-format",
      });
    },
  );

  // 6. Test error for non-existent valid UUID
  await TestValidator.error(
    "Retrieval with non-existent valid UUID should fail",
    async () => {
      await api.functional.redditCommunity.reportStatuses.at(connection, {
        statusId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
