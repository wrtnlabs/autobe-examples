import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Ensure that deleting a non-existent community report as an authenticated
 * adminUser results in a well-defined HTTP error instead of silent success.
 *
 * Business context:
 *
 * - Community reports represent moderation artifacts against entire communities.
 * - Admin users have high privileges to manage these reports, including permanent
 *   deletion.
 * - When an admin attempts to delete a report that does not exist, the platform
 *   must signal this clearly via an error response instead of behaving as if
 *   the deletion succeeded or causing an unhandled server error.
 *
 * Test flow:
 *
 * 1. Join as a new adminUser using /auth/adminUser/join.
 *
 *    - This both creates the account and establishes an authenticated admin context.
 * 2. Generate a random UUID that is extremely unlikely to correspond to any
 *    existing community report ID.
 * 3. Call DELETE /communityPlatform/adminUser/communityReports/{communityReportId}
 *    with that non-existent UUID while authenticated as the adminUser.
 * 4. Assert that the call fails by throwing an HTTP-layer error, confirming that
 *    the backend validates the existence of the target before deletion.
 */
export async function test_api_admin_community_report_delete_for_invalid_target(
  connection: api.IConnection,
) {
  // 1. Join as an adminUser to establish authenticated admin context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Generate a random UUID as a non-existent community report ID.
  const nonExistentCommunityReportId: string & tags.Format<"uuid"> =
    typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to delete the non-existent community report as the authenticated admin.
  // 4. Validate that an error is thrown instead of silent success.
  await TestValidator.error(
    "non-existent community report deletion should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.communityReports.erase(
        connection,
        {
          communityReportId: nonExistentCommunityReportId,
        },
      );
    },
  );
}
