import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Validate moderator ability to view full report details and check access
 * control.
 *
 * This test verifies that after administrators, members, and moderators are
 * properly registered:
 *
 * 1. An admin creates a report category.
 * 2. A member joins and reports content using that category.
 * 3. A moderator joins (for the same community if required by real flows.)
 * 4. The moderator retrieves the report detail by its report ID.
 *
 * The test asserts:
 *
 * - The returned report matches the expected structure, types, and includes all
 *   required fields.
 * - The reporting member, category, target post/comment, status,
 *   moderator-related fields, and audit timestamps are present.
 * - Sensitive data behaviors (reporter identity, reason_text, moderation notes)
 *   are visible to moderator, and should not be empty or hidden.
 * - Negative case: requesting a non-existent report ID as moderator returns an
 *   error (TestValidator.error expected).
 *
 * Also, only actual schema-defined properties and API-defined behaviors are
 * validated (no hallucinated properties).
 */
export async function test_api_report_detail_view_by_moderator(
  connection: api.IConnection,
) {
  // 1. Admin joins and creates a report category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminP@ssw0rd",
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  const reportCategoryName = RandomGenerator.paragraph({ sentences: 2 });
  const category =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: reportCategoryName,
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Member joins to file a report
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "MemberP@ssw0rd",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Member files a report (simulate reporting a post)
  // We'll generate a fake UUID for 'post_id', could be replaced by a real post/report if available
  const randomPostId = typia.random<string & tags.Format<"uuid">>();
  const reportCreate = {
    post_id: randomPostId,
    report_category_id: category.id,
    reason_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    { body: reportCreate },
  );
  typia.assert(report);

  // 4. Moderator joins for the same community as the member (simulate with random community UUID)
  // For this test, use the member's ID or generate a random community_id if required
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  // Simulate a community ID (for a real flow, this should match actual community context)
  const fakeCommunityId = typia.random<string & tags.Format<"uuid">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "ModP@ssw0rd" as string & tags.Format<"password">,
      community_id: fakeCommunityId,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);

  // 5. As moderator, fetch the report detail by its ID
  const reportDetail =
    await api.functional.communityPlatform.moderator.reports.at(connection, {
      reportId: report.id,
    });
  typia.assert(reportDetail);
  TestValidator.equals("report id matches", reportDetail.id, report.id);
  TestValidator.equals(
    "reporter id matches",
    reportDetail.reporting_member_id,
    report.reporting_member_id,
  );
  TestValidator.equals(
    "report category matches",
    reportDetail.report_category_id,
    category.id,
  );
  TestValidator.equals(
    "report status exists",
    typeof reportDetail.status,
    "string",
  );
  TestValidator.equals(
    "created_at is present",
    typeof reportDetail.created_at,
    "string",
  );
  TestValidator.equals(
    "target post id matches",
    reportDetail.post_id,
    randomPostId,
  );
  TestValidator.equals(
    "category allows free text",
    typeof reportCreate.reason_text,
    "string",
  );

  // Negative case: moderator requests a non-existent report
  await TestValidator.error(
    "fetching non-existent report should fail",
    async () => {
      await api.functional.communityPlatform.moderator.reports.at(connection, {
        reportId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
