import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_moderation_actions_update_failure(
  connection: api.IConnection,
) {
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.discussionBoard.moderator.reportedContent.moderationActions.update(
      connection,
      {
        reportedContentId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IDiscussionBoardModerationAction.IUpdate>(),
      },
    );
  });
}
