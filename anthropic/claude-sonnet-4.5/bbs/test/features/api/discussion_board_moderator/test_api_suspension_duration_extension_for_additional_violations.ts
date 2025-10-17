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

export async function test_api_suspension_duration_extension_for_additional_violations(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const adminForModeratorEmail = typia.random<string & tags.Format<"email">>();
  const adminForModerator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: adminForModeratorEmail,
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      } satisfies IDiscussionBoardAdministrator.ICreate,
    },
  );
  typia.assert(adminForModerator);

  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      appointed_by_admin_id: adminForModerator.id,
      username: RandomGenerator.alphaNumeric(10),
      email: moderatorEmail,
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member who will receive the extended suspension
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create administrator for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: adminEmail,
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 4: Create category for moderation context
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 5: Create topic by member for moderation context
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Step 6: Create moderation action documenting the violation
  const moderationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: {
          moderator_id: moderator.id,
          target_member_id: member.id,
          content_topic_id: topic.id,
          action_type: "issue_warning",
          reason: RandomGenerator.paragraph({ sentences: 5 }),
          violation_category: "spam",
          content_snapshot: topic.body,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 7: Create initial suspension with short duration (3 days)
  const initialSuspension =
    await api.functional.discussionBoard.moderator.suspensions.create(
      connection,
      {
        body: {
          member_id: member.id,
          suspension_reason:
            "Initial violation: spam content in discussion thread",
          duration_days: 3,
        } satisfies IDiscussionBoardSuspension.ICreate,
      },
    );
  typia.assert(initialSuspension);

  TestValidator.equals(
    "initial suspension is active",
    initialSuspension.is_active,
    true,
  );
  TestValidator.equals(
    "initial suspension duration is 3 days",
    initialSuspension.duration_days,
    3,
  );

  // Step 8: Extend suspension to longer duration (10 days) for additional violations
  const extendedSuspension =
    await api.functional.discussionBoard.moderator.suspensions.update(
      connection,
      {
        suspensionId: initialSuspension.id,
        body: {
          duration_days: 10,
          suspension_reason:
            "Extension: Additional violations during suspension period - attempted circumvention through alternate posting methods",
        } satisfies IDiscussionBoardSuspension.IUpdate,
      },
    );
  typia.assert(extendedSuspension);

  // Step 9: Verify end_date is recalculated correctly based on new duration
  const startDate = new Date(extendedSuspension.start_date);
  const expectedEndDate = new Date(
    startDate.getTime() + 10 * 24 * 60 * 60 * 1000,
  );
  const actualEndDate = new Date(extendedSuspension.end_date);

  const timeDifference = Math.abs(
    expectedEndDate.getTime() - actualEndDate.getTime(),
  );
  const daysDifference = timeDifference / (24 * 60 * 60 * 1000);

  TestValidator.predicate(
    "end_date recalculated for 10 day duration",
    daysDifference < 1,
  );

  // Step 10: Verify suspension_reason is updated with extension justification
  TestValidator.predicate(
    "suspension reason contains extension justification",
    extendedSuspension.suspension_reason.includes("Extension") &&
      extendedSuspension.suspension_reason.includes("Additional violations"),
  );

  // Step 11: Verify suspension remains active
  TestValidator.equals(
    "suspension remains active after extension",
    extendedSuspension.is_active,
    true,
  );
  TestValidator.equals(
    "suspension duration updated to 10 days",
    extendedSuspension.duration_days,
    10,
  );
}
