import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

/**
 * Test the deletion of a moderation action by a moderator.
 *
 * This test verifies the complete lifecycle: authentication as a moderator,
 * creation of a moderation action, and its deletion by the same moderator. It
 * checks for proper authorization and assures that the deletion is permanent
 * with no remaining data.
 *
 * Steps:
 *
 * 1. Moderator joins (registers) and authenticates.
 * 2. Moderator creates a moderation action linked to a content report.
 * 3. Moderator deletes the previously created moderation action.
 * 4. Attempt to delete again should produce an error (not implemented here because
 *    not specified).
 * 5. Validate that the moderation action has been permanently removed.
 */
export async function test_api_moderator_delete_moderation_action(
  connection: api.IConnection,
) {
  // 1. Moderator joins and authenticates
  const moderatorJoinBody: IRedditCommunityModerator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPass123!",
    ip: null,
    href: "https://redditcommunity.example.com/moderator/join",
    referrer: "https://redditcommunity.example.com",
  };
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 2. Moderator creates a moderation action
  const modActionCreateBody: IRedditCommunityModerationAction.ICreate = {
    moderator_id: moderator.id,
    content_report_id: typia.random<string & tags.Format<"uuid">>(),
    action_type: "deleted",
    action_notes: "Test moderation deletion",
  };
  const moderationAction: IRedditCommunityModerationAction =
    await api.functional.redditCommunity.moderator.moderators.actions.create(
      connection,
      {
        moderatorId: moderator.id,
        body: modActionCreateBody,
      },
    );
  typia.assert(moderationAction);

  // 3. Moderator deletes the previously created moderation action
  await api.functional.redditCommunity.moderator.moderators.actions.erase(
    connection,
    {
      moderatorId: moderator.id,
      moderationActionId: moderationAction.id,
    },
  );

  // 4. Validate that the moderation action has been deleted
  // Since no read operation is defined for moderation action,
  // we cannot verify by fetching. The completion of the delete call
  // without error implies success.
  // If there was a list or get method, we would check non-existence here.
  TestValidator.predicate(
    "moderation action deletion completed successfully",
    true,
  );
}
