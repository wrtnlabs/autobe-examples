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
import type { IDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuspension";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test administrator authority to override moderator suspension decisions by
 * extending duration beyond moderator limits.
 *
 * This test validates the hierarchical authority structure where administrators
 * can override moderator suspension decisions with longer durations. Moderators
 * are limited to 30-day suspensions, while administrators can issue suspensions
 * up to 365 days.
 *
 * Test workflow:
 *
 * 1. Create and authenticate as administrator
 * 2. Create moderator account (appointed by admin)
 * 3. Create member account to be suspended
 * 4. Create category and topic for moderation context
 * 5. Create moderation action as moderator
 * 6. Create initial suspension with moderator's max duration (30 days)
 * 7. As administrator, extend suspension to 90 days (beyond moderator limit)
 * 8. Verify suspension duration extended to 90 days
 * 9. Verify administrator_id updated to reflect modifying admin
 * 10. Verify end_date recalculated correctly
 * 11. Verify suspension remains active
 */
export async function test_api_suspension_administrator_override_moderator_decision(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // Step 2: Create moderator account (appointed by the admin)
  const moderatorBody = {
    appointed_by_admin_id: admin.id,
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // Step 3: Create member account to be suspended
  const memberBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // Step 4: Switch back to admin and create category
  await api.functional.auth.administrator.join(connection, {
    body: adminBody,
  });

  const categoryBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
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
        body: categoryBody,
      },
    );
  typia.assert(category);

  // Step 5: Switch to member and create topic
  await api.functional.auth.member.join(connection, {
    body: memberBody,
  });

  const topicBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicBody,
    });
  typia.assert(topic);

  // Step 6: Switch to moderator and create moderation action
  await api.functional.auth.moderator.join(connection, {
    body: moderatorBody,
  });

  const moderationActionBody = {
    moderator_id: moderator.id,
    administrator_id: undefined,
    target_member_id: member.id,
    related_report_id: undefined,
    content_topic_id: topic.id,
    content_reply_id: undefined,
    action_type: "suspend_user" as const,
    reason: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 5,
      wordMax: 10,
    }),
    violation_category: "spam" as const,
    content_snapshot: topic.body,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert(moderationAction);

  // Step 7: Switch back to admin and create initial suspension with moderator's max duration (30 days)
  await api.functional.auth.administrator.join(connection, {
    body: adminBody,
  });

  const initialSuspensionBody = {
    member_id: member.id,
    suspension_reason: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 5,
      wordMax: 10,
    }),
    duration_days: 30 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<30>,
  } satisfies IDiscussionBoardSuspension.ICreate;

  const initialSuspension: IDiscussionBoardSuspension =
    await api.functional.discussionBoard.administrator.suspensions.create(
      connection,
      {
        body: initialSuspensionBody,
      },
    );
  typia.assert(initialSuspension);

  // Step 8: As administrator, extend suspension to 90 days (beyond moderator limit)
  const extendedDuration = 90 satisfies number & tags.Type<"int32">;
  const updateBody = {
    suspension_reason: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 5,
      wordMax: 10,
    }),
    duration_days: extendedDuration,
  } satisfies IDiscussionBoardSuspension.IUpdate;

  const updatedSuspension: IDiscussionBoardSuspension =
    await api.functional.discussionBoard.administrator.suspensions.update(
      connection,
      {
        suspensionId: initialSuspension.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSuspension);

  // Step 9: Verify suspension duration extended to 90 days
  TestValidator.equals(
    "suspension duration extended to 90 days",
    updatedSuspension.duration_days,
    extendedDuration,
  );

  // Step 10: Verify administrator_id reflects the modifying administrator
  TestValidator.equals(
    "administrator_id updated to modifying admin",
    updatedSuspension.administrator_id,
    admin.id,
  );

  // Step 11: Verify end_date recalculated correctly based on 90-day duration
  const startDate = new Date(updatedSuspension.start_date);
  const endDate = new Date(updatedSuspension.end_date);
  const daysDifference = Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  TestValidator.equals(
    "end_date recalculated correctly for 90 days",
    daysDifference,
    extendedDuration,
  );

  // Step 12: Verify suspension remains active
  TestValidator.equals(
    "suspension remains active",
    updatedSuspension.is_active,
    true,
  );
}
