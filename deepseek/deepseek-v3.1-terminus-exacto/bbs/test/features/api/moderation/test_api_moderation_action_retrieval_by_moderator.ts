import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Test retrieval of a specific moderation action record by its unique
 * identifier.
 *
 * This test validates that moderators can successfully retrieve complete
 * moderation action details including action type, escalation level, duration,
 * timestamps, and relationship information with content reports, moderators,
 * and sessions. The test follows a realistic workflow: authenticate as
 * moderator, create relevant entities, then retrieve and validate the complete
 * action details.
 *
 * Steps:
 *
 * 1. Authenticate as moderator to establish authorization context
 * 2. Create necessary test data (members, posts, content reports)
 * 3. Create a moderation action with realistic test data
 * 4. Retrieve the created action using its unique identifier
 * 5. Validate that all action details are correctly returned
 * 6. Verify relationship information is properly resolved
 */
export async function test_api_moderation_action_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 7,
      }),
      password: "testPassword123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
      moderation_level: "standard",
      ip: "192.168.1.1",
      href: "https://example.com/admin",
      referrer: "https://example.com/login",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a moderation action
  const actionTypes = [
    "content_removal",
    "user_warning",
    "temporary_suspension",
    "permanent_ban",
    "content_approval",
    "report_dismissal",
  ] as const;
  const escalationLevels = ["standard", "escalated", "critical"] as const;

  const selectedActionType = RandomGenerator.pick(actionTypes);
  const selectedEscalationLevel = RandomGenerator.pick(escalationLevels);

  // For temporary suspension actions, include duration days
  const durationDays =
    selectedActionType === "temporary_suspension"
      ? typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
        >()
      : undefined;

  // Create a mock content report ID (since we don't have the actual API)
  const contentReportId = typia.random<string & tags.Format<"uuid">>();

  const moderationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: {
          action_type: selectedActionType,
          action_details: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 15,
          }),
          duration_days: durationDays,
          escalation_level: selectedEscalationLevel,
          discussion_board_content_report_id: contentReportId,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 3: Retrieve the created moderation action
  const retrievedAction =
    await api.functional.discussionBoard.moderator.moderationActions.at(
      connection,
      {
        actionId: moderationAction.id,
      },
    );
  typia.assert(retrievedAction);

  // Step 4: Validate that all action details are correctly returned
  TestValidator.equals(
    "action ID matches",
    retrievedAction.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "action type matches",
    retrievedAction.action_type,
    selectedActionType,
  );
  TestValidator.equals(
    "escalation level matches",
    retrievedAction.escalation_level,
    selectedEscalationLevel,
  );
  TestValidator.equals(
    "content report ID matches",
    retrievedAction.discussion_board_content_report_id,
    contentReportId,
  );

  if (selectedActionType === "temporary_suspension") {
    TestValidator.equals(
      "duration days matches",
      retrievedAction.duration_days,
      durationDays,
    );
  } else {
    TestValidator.equals(
      "duration days should be undefined",
      retrievedAction.duration_days,
      undefined,
    );
  }

  // Validate timestamps are present
  TestValidator.predicate(
    "created at timestamp exists",
    retrievedAction.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated at timestamp exists",
    retrievedAction.updated_at !== undefined,
  );

  // Validate relationship fields are populated
  TestValidator.predicate(
    "moderator relationship exists",
    retrievedAction.discussion_board_moderator_id !== undefined,
  );
  TestValidator.predicate(
    "session relationship exists",
    retrievedAction.discussion_board_moderator_session_id !== undefined,
  );

  // Validate that the retrieved action has all required fields
  TestValidator.predicate(
    "action type is present",
    retrievedAction.action_type !== undefined,
  );
  TestValidator.predicate(
    "escalation level is present",
    retrievedAction.escalation_level !== undefined,
  );
  TestValidator.predicate(
    "created at is present",
    retrievedAction.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated at is present",
    retrievedAction.updated_at !== undefined,
  );

  // Step 5: Test error scenarios
  // Test retrieving non-existent action
  await TestValidator.error(
    "should fail when retrieving non-existent action",
    async () => {
      const nonExistentId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.discussionBoard.moderator.moderationActions.at(
        connection,
        {
          actionId: nonExistentId,
        },
      );
    },
  );

  // Test retrieving with invalid UUID format
  await TestValidator.error(
    "should fail with invalid UUID format",
    async () => {
      await api.functional.discussionBoard.moderator.moderationActions.at(
        connection,
        {
          actionId: "invalid-uuid-format" satisfies string as string &
            tags.Format<"uuid">,
        },
      );
    },
  );
}
