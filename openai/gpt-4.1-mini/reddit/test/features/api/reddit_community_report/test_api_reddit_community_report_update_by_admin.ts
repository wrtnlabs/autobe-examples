import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";

/**
 * Test updating an existing reddit community content report by admin user.
 *
 * This scenario validates that an admin user can authenticate and perform
 * updates on content reports. It tests updating various report attributes
 * including reason, description, status, update timestamp, and optional soft
 * deletion.
 *
 * Steps:
 *
 * 1. Admin user joins/authenticates and obtains access token
 * 2. Prepare realistic update data for the report
 * 3. Perform the PUT update operation against
 *    /redditCommunity/admin/redditCommunityReports/{id}
 * 4. Verify the returned updated report response matches the update input
 * 5. Confirm fields including nullable soft deletion timestamp behave correctly
 *
 * The test covers typical admin moderation update workflows with proper
 * authentication and payload validation.
 */
export async function test_api_reddit_community_report_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins/authenticates
  const adminCreateBody = {
    email: `${RandomGenerator.alphaNumeric(4)}@example.com`,
    password: `SecurePass123!`,
  } satisfies IRedditCommunityAdmin.ICreate;

  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 2. Prepare realistic update data
  const now = new Date().toISOString();
  // Randomly decide deleted_at to null or recent ISO string
  const deletedAt: string | null =
    Math.random() < 0.5 ? null : new Date(Date.now() - 86400000).toISOString();

  const updateBody = {
    reason: RandomGenerator.alphaNumeric(12),
    description: `Automated update test description: ${RandomGenerator.paragraph({ sentences: 3 })}`,
    status: RandomGenerator.pick(["pending", "reviewed", "resolved"] as const),
    updated_at: now,
    deleted_at: deletedAt,
  } satisfies IRedditCommunityReport.IUpdate;

  // Use a random UUID as existing report ID (valid format)
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // 3. Perform PUT update operation
  const updatedReport: IRedditCommunityReport =
    await api.functional.redditCommunity.admin.redditCommunityReports.update(
      connection,
      { id: reportId, body: updateBody },
    );
  typia.assert(updatedReport);

  // 4. Verify returned updated report matches the input where fields are updatable
  TestValidator.equals(
    "Updated report reason should match input",
    updatedReport.reason,
    updateBody.reason,
  );
  TestValidator.equals(
    "Updated report description should match input",
    updatedReport.description,
    updateBody.description,
  );
  TestValidator.equals(
    "Updated report status should match input",
    updatedReport.status,
    updateBody.status,
  );
  TestValidator.equals(
    "Updated report updated_at should match input",
    updatedReport.updated_at,
    updateBody.updated_at,
  );

  // 5. Confirm deleted_at field matches input (including explicit null)
  TestValidator.equals(
    "Updated report deleted_at should match input",
    updatedReport.deleted_at ?? null,
    updateBody.deleted_at,
  );
}
