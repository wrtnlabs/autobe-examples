import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuspension";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test administrator's ability to extend suspension to maximum allowed duration
 * (365 days).
 *
 * This test validates that administrators can exercise their full authority to
 * impose maximum-length suspensions for severe or repeated violations. The test
 * establishes a complete moderation workflow context, creates an initial short
 * suspension, and then demonstrates the administrator's power to extend the
 * suspension to the maximum allowed duration of 365 days.
 *
 * Workflow:
 *
 * 1. Create administrator account with suspension management authority
 * 2. Create member account that will receive the extended suspension
 * 3. Establish moderation context with category and topic
 * 4. Create moderation action documenting the violation
 * 5. Create initial short-duration suspension (7 days)
 * 6. Administrator extends suspension to maximum duration (365 days)
 * 7. Validate that duration_days updates to 365
 * 8. Verify that end_date recalculates correctly (one year from start)
 * 9. Confirm suspension_reason reflects the extension justification
 * 10. Ensure suspension remains active throughout the extension
 */
export async function test_api_suspension_administrator_maximum_duration_extension(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const administrator: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(administrator);

  // Step 2: Create member account to receive suspension
  const memberCredentials = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCredentials,
    });
  typia.assert(member);

  // Switch back to administrator context for moderation actions
  connection.headers = { Authorization: administrator.token.access };

  // Step 3: Create category for moderation context
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_category_id: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 4: Create topic as member for moderation context
  connection.headers = { Authorization: member.token.access };

  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(topic);

  // Step 5: Switch back to administrator and create moderation action
  connection.headers = { Authorization: administrator.token.access };

  const moderationActionData = {
    administrator_id: administrator.id,
    target_member_id: member.id,
    content_topic_id: topic.id,
    action_type: "suspend_user" as const,
    reason:
      "Severe violation of community guidelines requiring extended suspension period for repeated offensive behavior and harassment",
    violation_category: "personal_attack" as const,
    content_snapshot: topic.body,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.administrator.moderationActions.create(
      connection,
      {
        body: moderationActionData,
      },
    );
  typia.assert(moderationAction);

  // Step 6: Create initial short-duration suspension (7 days)
  const initialSuspensionData = {
    member_id: member.id,
    suspension_reason:
      "Initial suspension for personal attack and harassment in discussion topic. Member has been warned previously about similar behavior.",
    duration_days: 7,
  } satisfies IDiscussionBoardSuspension.ICreate;

  const initialSuspension: IDiscussionBoardSuspension =
    await api.functional.discussionBoard.administrator.suspensions.create(
      connection,
      {
        body: initialSuspensionData,
      },
    );
  typia.assert(initialSuspension);

  // Validate initial suspension was created with correct 7-day duration
  TestValidator.equals(
    "initial suspension duration",
    initialSuspension.duration_days,
    7,
  );
  TestValidator.equals(
    "initial suspension is active",
    initialSuspension.is_active,
    true,
  );

  // Step 7: Administrator extends suspension to maximum duration (365 days)
  const extensionUpdate = {
    suspension_reason:
      "Suspension extended to maximum duration (365 days) due to discovery of additional severe violations during suspension period. Member demonstrated pattern of repeated harassment across multiple topics and users, warranting maximum enforcement period.",
    duration_days: 365,
  } satisfies IDiscussionBoardSuspension.IUpdate;

  const extendedSuspension: IDiscussionBoardSuspension =
    await api.functional.discussionBoard.administrator.suspensions.update(
      connection,
      {
        suspensionId: initialSuspension.id,
        body: extensionUpdate,
      },
    );
  typia.assert(extendedSuspension);

  // Step 8: Validate duration_days updated to maximum (365)
  TestValidator.equals(
    "suspension extended to maximum duration",
    extendedSuspension.duration_days,
    365,
  );

  // Step 9: Verify end_date recalculated correctly (one year from start_date)
  const startDate = new Date(extendedSuspension.start_date);
  const endDate = new Date(extendedSuspension.end_date);
  const expectedEndDate = new Date(startDate);
  expectedEndDate.setDate(expectedEndDate.getDate() + 365);

  const daysDifference = Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  TestValidator.equals(
    "end_date is 365 days from start_date",
    daysDifference,
    365,
  );

  // Step 10: Confirm suspension_reason updated with extension justification
  TestValidator.predicate(
    "suspension reason includes extension justification",
    extendedSuspension.suspension_reason.includes("365 days") &&
      extendedSuspension.suspension_reason.includes("maximum"),
  );

  // Step 11: Ensure suspension remains active after extension
  TestValidator.equals(
    "suspension remains active after extension",
    extendedSuspension.is_active,
    true,
  );

  // Step 12: Verify suspension was not lifted early
  TestValidator.equals(
    "suspension not lifted early",
    extendedSuspension.lifted_early,
    false,
  );
  TestValidator.equals(
    "no lift timestamp",
    extendedSuspension.lifted_at,
    undefined,
  );
}
