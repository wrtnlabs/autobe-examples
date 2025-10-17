import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

export async function test_api_report_dismissal_with_reason(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!@#";

  // First need admin to appoint moderator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!@#";

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create moderator with admin appointment
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        appointed_by_admin_id: admin.id,
        username: RandomGenerator.alphaNumeric(10),
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Create discussion category (admin is already authenticated)
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          parent_category_id: null,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123!@#";

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 5: Create discussion topic
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 6: Member submits a report on the topic
  const violationCategories = ["spam", "off_topic", "trolling"] as const;
  const selectedViolation = RandomGenerator.pick(violationCategories);

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reported_topic_id: topic.id,
        reported_reply_id: null,
        violation_category: selectedViolation,
        reporter_explanation: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(report);

  // Verify initial report state
  TestValidator.equals("initial status is pending", report.status, "pending");
  TestValidator.equals(
    "initially unassigned",
    report.assigned_moderator_id,
    null,
  );

  // Step 7: Moderator assigns themselves to the report
  const assignedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.update(connection, {
      reportId: report.id,
      body: {
        assigned_moderator_id: moderator.id,
        status: "under_review",
      } satisfies IDiscussionBoardReport.IUpdate,
    });
  typia.assert(assignedReport);

  TestValidator.equals(
    "moderator assigned",
    assignedReport.assigned_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "status updated to under_review",
    assignedReport.status,
    "under_review",
  );

  // Step 8: Moderator dismisses the report with dismissal reason
  const dismissalReasons = [
    "no_violation",
    "within_guidelines",
    "malicious_report",
    "insufficient_evidence",
  ] as const;
  const selectedDismissalReason = RandomGenerator.pick(dismissalReasons);

  const dismissedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.update(connection, {
      reportId: report.id,
      body: {
        status: "dismissed",
        dismissal_reason: selectedDismissalReason,
      } satisfies IDiscussionBoardReport.IUpdate,
    });
  typia.assert(dismissedReport);

  // Step 9: Verify the report shows dismissed status with dismissal reason
  TestValidator.equals(
    "report status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.equals(
    "dismissal reason recorded",
    dismissedReport.dismissal_reason,
    selectedDismissalReason,
  );
  TestValidator.equals(
    "moderator still assigned",
    dismissedReport.assigned_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "reported topic unchanged",
    dismissedReport.reported_topic_id,
    topic.id,
  );
}
