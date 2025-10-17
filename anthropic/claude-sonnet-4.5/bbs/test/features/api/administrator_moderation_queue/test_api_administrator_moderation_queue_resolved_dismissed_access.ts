import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

/**
 * Test administrator access to moderation actions queue.
 *
 * This test validates that administrators can access the moderation actions API
 * which tracks enforcement decisions made by moderators. It creates reports
 * with various statuses and verifies that administrators have proper access to
 * the moderation actions queue for audit and oversight purposes.
 *
 * Note: The test focuses on accessing moderation actions rather than filtering
 * reports by status, as the available API returns moderation action records
 * (enforcement decisions) rather than report records themselves.
 *
 * Workflow:
 *
 * 1. Create administrator account for accessing moderation data
 * 2. Create moderator account to process reports
 * 3. Create member accounts for generating reportable content
 * 4. Create categories and topics that will be reported
 * 5. Submit multiple reports on the created content
 * 6. Process reports to various statuses via moderator
 * 7. Retrieve moderation actions queue as administrator
 * 8. Validate administrator access to moderation actions data
 */
export async function test_api_administrator_moderation_queue_resolved_dismissed_access(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create moderator account
  const moderatorData = {
    appointed_by_admin_id: admin.id,
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 3: Create member account for generating reportable content
  const member1Data = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardMember.ICreate;

  const member1 = await api.functional.auth.member.join(connection, {
    body: member1Data,
  });
  typia.assert(member1);

  const member2Data = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardMember.ICreate;

  const member2 = await api.functional.auth.member.join(connection, {
    body: member2Data,
  });
  typia.assert(member2);

  // Step 4: Create category for topic creation (as administrator)
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 5: Create topics as member1
  const topic1Data = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic1 = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: topic1Data,
    },
  );
  typia.assert(topic1);

  const topic2Data = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic2 = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: topic2Data,
    },
  );
  typia.assert(topic2);

  // Step 6: Submit reports as member2
  const violationCategories = ["spam", "hate_speech"] as const;

  const report1Data = {
    reported_topic_id: topic1.id,
    violation_category: violationCategories[0],
    reporter_explanation: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report1 = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: report1Data,
    },
  );
  typia.assert(report1);

  const report2Data = {
    reported_topic_id: topic2.id,
    violation_category: violationCategories[1],
    reporter_explanation: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report2 = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: report2Data,
    },
  );
  typia.assert(report2);

  // Step 7: Process reports as moderator
  const resolvedUpdate = {
    assigned_moderator_id: moderator.id,
    status: "resolved",
    resolution_notes: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardReport.IUpdate;

  const resolvedReport =
    await api.functional.discussionBoard.moderator.reports.update(connection, {
      reportId: report1.id,
      body: resolvedUpdate,
    });
  typia.assert(resolvedReport);

  const dismissedUpdate = {
    assigned_moderator_id: moderator.id,
    status: "dismissed",
    dismissal_reason: "no_violation",
  } satisfies IDiscussionBoardReport.IUpdate;

  const dismissedReport =
    await api.functional.discussionBoard.moderator.reports.update(connection, {
      reportId: report2.id,
      body: dismissedUpdate,
    });
  typia.assert(dismissedReport);

  // Step 8: Retrieve moderation actions queue as administrator
  const moderationRequest = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardModerationAction.IRequest;

  const moderationResults =
    await api.functional.discussionBoard.administrator.moderationActions.index(
      connection,
      {
        body: moderationRequest,
      },
    );
  typia.assert(moderationResults);

  // Step 9: Validate administrator access to moderation actions
  TestValidator.predicate(
    "administrator can access moderation actions queue",
    moderationResults.pagination !== null &&
      moderationResults.pagination !== undefined,
  );

  TestValidator.predicate(
    "moderation actions data is accessible",
    Array.isArray(moderationResults.data),
  );
}
