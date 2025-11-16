import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Validate that deleting a non-existent post report as an adminUser fails with
 * an error and does not silently succeed.
 *
 * Business context:
 *
 * - Post report records live in `community_platform_post_reports` and can only be
 *   deleted by high-privilege adminUser actors through the admin-only erase
 *   endpoint.
 * - When a client attempts to delete a report that does not exist, the backend
 *   should respond with a not-found style error instead of treating the
 *   operation as success. This is important for moderation tooling, where
 *   operators need to know when a report was already removed or never existed
 *   in the first place.
 *
 * Test flow:
 *
 * 1. Register a new adminUser via POST /auth/adminUser/join and obtain an
 *    authorized admin context (tokens handled automatically by the SDK).
 * 2. Generate a fresh random UUID and treat it as a non-existent `postReportId`
 *    for this test scenario. Since we do not create any post reports and have
 *    no read/list endpoints in scope, we rely on the fact that this id is not
 *    tied to any created report within this test.
 * 3. Invoke DELETE /communityPlatform/adminUser/postReports/{postReportId} with
 *    the non-existent id using the authenticated admin connection.
 * 4. Assert that the erase operation fails by wrapping it in TestValidator.error,
 *    confirming that the backend does not silently succeed on missing targets.
 *    We intentionally do not assert specific HTTP status codes.
 */
export async function test_api_post_report_delete_for_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to obtain an authorized admin context
  const adminJoinBody =
    typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Generate a UUID that will be used as a non-existent postReportId
  const nonexistentPostReportId = typia.random<string & tags.Format<"uuid">>();

  // 3 & 4. Try to delete the non-existent post report and expect an error
  await TestValidator.error(
    "deleting a non-existent post report as adminUser should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.postReports.erase(
        connection,
        {
          postReportId: nonexistentPostReportId,
        },
      );
    },
  );
}
