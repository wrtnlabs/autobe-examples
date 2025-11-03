import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportActions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportActions";
import type { ICommunityPlatformReportOfComments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComments";
import type { ICommunityPlatformReportOfPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPosts";
import type { ICommunityPlatformReports } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReports";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test retrieval of comment details associated with a specific report as
 * authenticated admin.
 *
 * Steps:
 *
 * 1. Register and authenticate as an admin using random credentials.
 * 2. Simulate reporting a comment by creating a new report of type 'spam' with a
 *    random commentId as target_comment_id.
 * 3. Retrieve the reported comment through the endpoint
 *    /communityPlatform/admin/reports/{reportId}/comment as the admin.
 * 4. Validate that the returned details include correct associations matching the
 *    report and the target commentId, with all expected metadata fields.
 * 5. Attempt to retrieve comment details with a random invalid reportId to check
 *    error handling.
 * 6. Simulate a report targeting a post (not a comment), and verify that
 *    attempting to retrieve comment details of that reportId results in an
 *    error.
 */
export async function test_api_report_comment_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const registration = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "",
      ip: undefined,
    },
  });
  typia.assert(registration);

  // 2. Simulate reporting a comment
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const report = await api.functional.communityPlatform.admin.reports.create(
    connection,
    {
      body: {
        report_type: RandomGenerator.pick([
          "spam",
          "abuse",
          "off_topic",
          "harassment",
          "explicit_content",
          "other",
        ] as const),
        description: RandomGenerator.paragraph(),
        target_post_id: null,
        target_comment_id: commentId,
      },
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "report targets commentId",
    report.comment_report?.target_comment_id,
    commentId,
  );

  // 3. Retrieve comment details for report as admin
  const commentDetails =
    await api.functional.communityPlatform.admin.reports.comment.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(commentDetails);
  TestValidator.equals(
    "reportId matches in comment_report",
    commentDetails.report_id,
    report.id,
  );
  TestValidator.equals(
    "target_comment_id matches original commentId",
    commentDetails.target_comment_id,
    commentId,
  );

  // 4. Error case: invalid reportId
  await TestValidator.error("error for non-existent reportId", async () => {
    await api.functional.communityPlatform.admin.reports.comment.at(
      connection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 5. Error case: report targets a post, not a comment
  const postId = typia.random<string & tags.Format<"uuid">>();
  const postReport =
    await api.functional.communityPlatform.admin.reports.create(connection, {
      body: {
        report_type: "abuse",
        description: "Reporting a post",
        target_post_id: postId,
        target_comment_id: null,
      },
    });
  typia.assert(postReport);

  await TestValidator.error(
    "error for reportId not targeting comment",
    async () => {
      await api.functional.communityPlatform.admin.reports.comment.at(
        connection,
        {
          reportId: postReport.id,
        },
      );
    },
  );
}
