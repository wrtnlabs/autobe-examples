import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

export async function test_api_moderation_actions_sorting_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorDisplayName = RandomGenerator.name();

  const authResult = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: "SecurePassword123",
      display_name: moderatorDisplayName,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(authResult);

  // Step 2: Fetch moderation actions sorted by moderatorId in ascending order
  const ascendingResult =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          orderBy: "moderatorId",
          order: "asc",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Step 3: Verify ascending sort order by moderatorId
  if (ascendingResult.data && ascendingResult.data.length > 1) {
    const moderatorIds = ascendingResult.data.map(
      (action) => action.moderatorId,
    );
    for (let i = 0; i < moderatorIds.length - 1; i++) {
      TestValidator.predicate(
        `moderator ID at position ${i} should be <= moderator ID at position ${i + 1} in ascending order`,
        moderatorIds[i] <= moderatorIds[i + 1],
      );
    }
  }

  // Step 4: Fetch moderation actions sorted by moderatorId in descending order
  const descendingResult =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          orderBy: "moderatorId",
          order: "desc",
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Step 5: Verify descending sort order by moderatorId
  if (descendingResult.data && descendingResult.data.length > 1) {
    const moderatorIds = descendingResult.data.map(
      (action) => action.moderatorId,
    );
    for (let i = 0; i < moderatorIds.length - 1; i++) {
      TestValidator.predicate(
        `moderator ID at position ${i} should be >= moderator ID at position ${i + 1} in descending order`,
        moderatorIds[i] >= moderatorIds[i + 1],
      );
    }
  }

  // Step 6: Verify both result sets contain same number of actions
  if (ascendingResult.data && descendingResult.data) {
    TestValidator.equals(
      "ascending and descending results should have same data count",
      ascendingResult.data.length,
      descendingResult.data.length,
    );
  }

  // Step 7: Verify reverse order relationship between ascending and descending results
  if (
    ascendingResult.data &&
    descendingResult.data &&
    ascendingResult.data.length > 0
  ) {
    const lastAscending = ascendingResult.data[ascendingResult.data.length - 1];
    const firstDescending = descendingResult.data[0];

    TestValidator.equals(
      "last action ID in ascending order should match first action ID in descending order",
      lastAscending.id,
      firstDescending.id,
    );

    const firstAscending = ascendingResult.data[0];
    const lastDescending =
      descendingResult.data[descendingResult.data.length - 1];

    TestValidator.equals(
      "first action ID in ascending order should match last action ID in descending order",
      firstAscending.id,
      lastDescending.id,
    );
  }
}
