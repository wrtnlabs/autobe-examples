import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_moderation_actions_update_success(
  connection: api.IConnection,
) {
  // Create moderator account for authentication
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: RandomGenerator.name() + "@" + RandomGenerator.name() + ".com",
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Generate a valid reportedContentId (this might need to be adjusted based on actual implementation)
  const reportedContentId = "some-valid-reported-content-id";

  // Update moderation actions
  const updatedModerationAction =
    await api.functional.discussionBoard.moderator.reportedContent.moderationActions.update(
      connection,
      {
        reportedContentId,
        body: RandomGenerator.alphaNumeric(
          10,
        ) satisfies IDiscussionBoardModerationAction.IUpdate,
      },
    );
  typia.assert(updatedModerationAction);

  TestValidator.equals(
    "Moderation action updated successfully",
    updatedModerationAction,
    RandomGenerator.alphaNumeric(10),
  );

  // Additional validation can be added here
}
