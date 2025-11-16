import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformReportOfComments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComments";

/**
 * Validate behavior when a platform administrator requests the reported comment
 * of a non-existent report.
 *
 * Business intent:
 *
 * - Ensure that the reported-comment lookup endpoint does not return a successful
 *   ICommunityPlatformReportOfComments payload when the target reportId does
 *   not exist (or is otherwise inaccessible), even though the caller is a fully
 *   authenticated platformAdmin.
 * - Confirm that the failure is due to a missing/invalid resource rather than
 *   authentication, without coupling the test to a specific HTTP status code.
 *
 * Steps:
 *
 * 1. Register a new platformAdmin using POST /auth/platformAdmin/join, letting the
 *    SDK establish Authorization headers for subsequent calls.
 * 2. Generate a syntactically valid UUID that is extremely unlikely to correspond
 *    to an existing community_platform_reports row.
 * 3. Call GET /communityPlatform/platformAdmin/reports/{reportId}/comment with
 *    that UUID.
 * 4. Verify that the call throws an error (e.g., HttpError) instead of returning
 *    an ICommunityPlatformReportOfComments object.
 *
 * Assertions:
 *
 * - Platform admin join succeeds and returns a structurally valid
 *   ICommunityPlatformPlatformadmin.IAuthorized object.
 * - The reported-comment endpoint invocation fails, and the failure is captured
 *   by TestValidator.error.
 * - The test does not depend on any exact HTTP status code or error message.
 */
export async function test_api_platformadmin_reported_comment_missing_report(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and establish an authenticated session
  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: typia.random<ICommunityPlatformPlatformadmin.IJoin>(),
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Prepare a syntactically valid but logically non-existent report UUID
  const missingReportId = typia.random<string & tags.Format<"uuid">>();

  // 3. Call the reported-comment endpoint with the non-existent reportId
  // 4. Expect the call to fail with an error (e.g., HttpError)
  await TestValidator.error(
    "reported comment lookup must fail for missing report",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.comment.at(
        connection,
        {
          reportId: missingReportId,
        },
      );
    },
  );
}
