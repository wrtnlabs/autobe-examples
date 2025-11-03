import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorWelcome } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorWelcome";

export async function test_api_moderator_registration_success(
  connection: api.IConnection,
) {
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string = "SecurePassword123!";

  const welcomeMessage: IDiscussionBoardModeratorWelcome =
    await api.functional.discussionBoard.auth.moderator.join.create(
      connection,
      {
        body: moderatorEmail,
      },
    );
  typia.assert(welcomeMessage);
}
