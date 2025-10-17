import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test administrator's ability to dismiss reports with comprehensive dismissal
 * reasoning.
 *
 * This test validates the complete dismissal workflow for administrators who
 * handle content moderation. Due to API limitations (no login endpoints
 * available), this test uses a single administrator context throughout.
 *
 * Workflow steps:
 *
 * 1. Create administrator account via join (admin context established)
 * 2. Create discussion category
 * 3. Create member account (switches to member context)
 * 4. Create discussion topic
 * 5. Member submits report on the topic
 * 6. Create second administrator for report handling (switches to admin context)
 * 7. Administrator assigns themselves to the report
 * 8. Administrator sets status to under_review
 * 9. Administrator dismisses the report with detailed dismissal_reason
 * 10. Verify report is properly dismissed with administrator's reasoning
 *
 * Validation points:
 *
 * - Administrators can dismiss reports with appropriate reasoning
 * - Dismissal reasons are recorded in the report record
 * - Dismissed status is properly set and logged
 */
export async function test_api_report_administrator_dismissal_with_detailed_reason(
  connection: api.IConnection,
) {
  // Step 1: Create first administrator account for category creation
  const firstAdminEmail = typia.random<string & tags.Format<"email">>();
  const firstAdminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const firstAdministrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: firstAdminEmail,
        password: firstAdminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    },
  );
  typia.assert(firstAdministrator);

  // Step 2: Create discussion category (admin context active)
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(15),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          display_order:
            (typia.random<
              number & tags.Type<"int32">
            >() satisfies number as number) % 100,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (switches to member context)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create discussion topic (member context active)
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Step 5: Member submits report on the topic
  const violationCategories = [
    "personal_attack",
    "hate_speech",
    "misinformation",
    "spam",
    "offensive_language",
    "off_topic",
    "trolling",
  ] as const;
  const selectedViolation = RandomGenerator.pick(violationCategories);

  const report = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        reported_topic_id: topic.id,
        violation_category: selectedViolation,
        reporter_explanation: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 6: Create second administrator for report handling (switches to admin context)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 7: Administrator assigns themselves to the report
  const assignedReport =
    await api.functional.discussionBoard.administrator.reports.update(
      connection,
      {
        reportId: report.id,
        body: {
          assigned_moderator_id: administrator.id,
        } satisfies IDiscussionBoardReport.IUpdate,
      },
    );
  typia.assert(assignedReport);
  TestValidator.equals(
    "administrator assigned to report",
    assignedReport.assigned_moderator_id,
    administrator.id,
  );

  // Step 8: Administrator sets status to under_review
  const underReviewReport =
    await api.functional.discussionBoard.administrator.reports.update(
      connection,
      {
        reportId: report.id,
        body: {
          status: "under_review",
        } satisfies IDiscussionBoardReport.IUpdate,
      },
    );
  typia.assert(underReviewReport);
  TestValidator.equals(
    "report status updated to under_review",
    underReviewReport.status,
    "under_review",
  );

  // Step 9: Administrator dismisses the report with detailed dismissal_reason
  const dismissalReasons = [
    "no_violation",
    "within_guidelines",
    "malicious_report",
    "insufficient_evidence",
    "other",
  ] as const;
  const selectedDismissalReason = RandomGenerator.pick(dismissalReasons);

  const dismissedReport =
    await api.functional.discussionBoard.administrator.reports.update(
      connection,
      {
        reportId: report.id,
        body: {
          status: "dismissed",
          dismissal_reason: selectedDismissalReason,
        } satisfies IDiscussionBoardReport.IUpdate,
      },
    );
  typia.assert(dismissedReport);

  // Step 10: Verify report is properly dismissed with administrator's reasoning
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
    "assigned moderator is administrator",
    dismissedReport.assigned_moderator_id,
    administrator.id,
  );
}
