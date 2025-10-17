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
 * Verify that a moderator can update a content report status and result through
 * the moderator API workflow.
 *
 * Steps:
 *
 * 1. Register an admin to set up report categories (admin join)
 * 2. Register a member who will file a report (member join)
 * 3. As admin, create a report category
 * 4. As member, submit a report on a (random) post
 * 5. Register a moderator for the same community (simulate community_id as random
 *    UUID)
 * 6. Switch to moderator and update the status/result of the report to
 *    'under_review'
 * 7. Update again to 'resolved' and set a moderation result
 * 8. Validate report transitions, actor enforcement, and audit fields
 */
export async function test_api_report_status_update_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPwd!1234";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    },
  });
  typia.assert(admin);

  // 2. Register a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPwd!5678";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  typia.assert(member);

  // 3. As admin, create a report category
  const category =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          allow_free_text: true,
        },
      },
    );
  typia.assert(category);

  // 4. As member, submit a report on a (random) post
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        report_category_id: category.id,
        reason_text: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(report);

  // 5. Register a moderator for the same community (simulate community_id as random UUID)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPwd!9999";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword as string & tags.Format<"password">,
      community_id: communityId,
    },
  });
  typia.assert(moderator);

  // 6. Switch to moderator (token is set)
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword as string & tags.Format<"password">,
      community_id: communityId,
    },
  });

  // 7. Moderator updates report status to 'under_review'
  const underReview =
    await api.functional.communityPlatform.moderator.reports.update(
      connection,
      {
        reportId: report.id,
        body: {
          status: "under_review",
          moderation_result: "in_review",
          moderated_by_id: moderator.id,
        },
      },
    );
  typia.assert(underReview);
  TestValidator.equals(
    "status should now be 'under_review'",
    underReview.status,
    "under_review",
  );
  TestValidator.equals(
    "moderated_by_id match",
    underReview.moderated_by_id,
    moderator.id,
  );

  // 8. Moderator sets report to 'resolved' with a final result
  const resolved =
    await api.functional.communityPlatform.moderator.reports.update(
      connection,
      {
        reportId: report.id,
        body: {
          status: "resolved",
          moderation_result: "removed",
          moderated_by_id: moderator.id,
        },
      },
    );
  typia.assert(resolved);
  TestValidator.equals(
    "status should be 'resolved'",
    resolved.status,
    "resolved",
  );
  TestValidator.equals(
    "moderation_result should be 'removed'",
    resolved.moderation_result,
    "removed",
  );
  TestValidator.equals(
    "moderated_by_id should remain moderator.id",
    resolved.moderated_by_id,
    moderator.id,
  );
}
