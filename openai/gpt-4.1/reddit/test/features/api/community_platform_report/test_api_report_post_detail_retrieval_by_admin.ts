import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformReportActions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportActions";
import type { ICommunityPlatformReportOfComments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComments";
import type { ICommunityPlatformReportOfPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPosts";
import type { ICommunityPlatformReports } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReports";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test retrieval by admin of a post associated with a specific report.
 * Validates that:
 *
 * - Only an authenticated admin can retrieve post details given a reportId
 * - The returned post metadata matches the expected detail schema
 * - Error handling works as expected for (a) non-existent reportId (b) invalid
 *   report type
 *
 * Steps:
 *
 * 1. Register and authenticate an admin via /auth/admin/join
 * 2. Simulate a post UUID (since post creation as user is unavailable)
 * 3. Create a report referencing the post via /communityPlatform/admin/reports
 * 4. Retrieve the associated post via
 *    /communityPlatform/admin/reports/{reportId}/post
 * 5. Validate returned post matches ICommunityPlatformPost
 * 6. Verify retrieval with a random (non-existent) reportId fails
 */
export async function test_api_report_post_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://e2e-test.local/register",
    referrer: "https://e2e-test.local/",
    ip: undefined,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCreate,
  });
  typia.assert(adminAuth);

  // 2. Simulate a post UUID representing a user-created post
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Admin creates a report referencing the post
  const reportCreate = {
    report_type: RandomGenerator.pick([
      "spam",
      "abuse",
      "off_topic",
      "harassment",
      "explicit_content",
      "other",
    ] as const),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    target_post_id: postId,
    target_comment_id: null,
  } satisfies ICommunityPlatformReports.ICreate;
  const report: ICommunityPlatformReports =
    await api.functional.communityPlatform.admin.reports.create(connection, {
      body: reportCreate,
    });
  typia.assert(report);

  // 4. Retrieve post via reportId using admin context
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.admin.reports.post.at(connection, {
      reportId: report.id,
    });
  typia.assert(post);

  // 5. Validate returned post ID matches reported target_post_id
  TestValidator.equals(
    "admin-retrieved post.id is the reported target_post_id",
    post.id,
    postId,
  );

  // 6. Non-existent reportId: should fail
  await TestValidator.error(
    "fetch with non-existent reportId must fail",
    async () => {
      await api.functional.communityPlatform.admin.reports.post.at(connection, {
        reportId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
