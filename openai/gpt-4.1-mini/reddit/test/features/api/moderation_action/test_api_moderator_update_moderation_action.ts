import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

/**
 * This test function verifies the capability of a moderator user to update an
 * existing moderation action on a content report. It simulates the complete
 * real-world workflow:
 *
 * 1. The moderator performs a join operation to authenticate and obtain JWT
 *    tokens.
 * 2. Using the moderator's ID, a new moderation action record is created on a
 *    content report.
 * 3. The moderator updates the moderation action, changing important fields such
 *    as action_type and action_notes.
 * 4. Validations ensure the update was successful, by confirming returned data and
 *    UUID consistency.
 *
 * This ensures authorization and data integrity of update operations on
 * moderation actions. It uses realistic dummy data for string, UUID, and
 * date-time format fields. The test asserts correct API responses and that
 * business rules for moderation actions are respected.
 *
 * All necessary required parameters per API function specifications are
 * included.
 */
export async function test_api_moderator_update_moderation_action(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderatorJoinBody: IRedditCommunityModerator.IJoin = {
    email: `moderator_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: `securePass123!`,
    ip: null,
    href: `https://example.com/login`,
    referrer: `https://example.com/referrer`,
  };

  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 2. Create a moderation action
  const moderationActionCreateBody: IRedditCommunityModerationAction.ICreate = {
    moderator_id: moderator.id,
    content_report_id: typia.random<string & tags.Format<"uuid">>(),
    action_type: "deleted",
    action_notes: "Initial deletion due to rule violation.",
  };

  const createdAction: IRedditCommunityModerationAction =
    await api.functional.redditCommunity.moderator.moderators.actions.create(
      connection,
      {
        moderatorId: moderator.id,
        body: moderationActionCreateBody,
      },
    );

  typia.assert(createdAction);
  TestValidator.equals(
    "created action moderator_id matches",
    createdAction.moderator_id,
    moderator.id,
  );

  // 3. Update the moderation action
  const moderationActionUpdateBody: IRedditCommunityModerationAction.IUpdate = {
    action_type: "dismissed",
    action_notes: "Reviewed and dismissed after re-evaluation.",
  };

  const updatedAction: IRedditCommunityModerationAction =
    await api.functional.redditCommunity.moderator.moderators.actions.update(
      connection,
      {
        moderatorId: moderator.id,
        moderationActionId: createdAction.id,
        body: moderationActionUpdateBody,
      },
    );

  typia.assert(updatedAction);

  // 4. Validate that the update took effect
  TestValidator.equals(
    "updated action id matches created action id",
    updatedAction.id,
    createdAction.id,
  );
  TestValidator.equals(
    "updated action_type is 'dismissed'",
    updatedAction.action_type,
    "dismissed",
  );
  TestValidator.equals(
    "updated action_notes are updated",
    updatedAction.action_notes,
    "Reviewed and dismissed after re-evaluation.",
  );
  TestValidator.predicate(
    "updated action updated_at is later than or equal to created_at",
    updatedAction.updated_at >= updatedAction.created_at,
  );
}
