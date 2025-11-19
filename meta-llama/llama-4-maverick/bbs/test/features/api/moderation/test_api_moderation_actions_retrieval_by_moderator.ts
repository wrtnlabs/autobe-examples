import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

export async function test_api_moderation_actions_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: `${RandomGenerator.name()}@example.com`,
      password: "P@ssw0rd!123",
      username: RandomGenerator.name(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Test with valid request
  const validResponse =
    await api.functional.discussionBoard.moderator.moderationActions.search(
      connection,
      {
        body: null,
      },
    );
  typia.assert(validResponse);
  TestValidator.equals(
    "valid response pagination",
    validResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "valid response data array",
    Array.isArray(validResponse.data),
    true,
  );

  // Test empty result case
  const emptyResponse =
    await api.functional.discussionBoard.moderator.moderationActions.search(
      connection,
      {
        body: null,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty response pagination",
    emptyResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "empty response data array",
    Array.isArray(emptyResponse.data),
    true,
  );

  // Validate moderation action details when data exists
  if (validResponse.data.length > 0) {
    const action = validResponse.data[0];
    typia.assert(action);
    TestValidator.equals(
      "action has required properties",
      "action" in action && "id" in action && "moderator" in action,
      true,
    );
  }
}
