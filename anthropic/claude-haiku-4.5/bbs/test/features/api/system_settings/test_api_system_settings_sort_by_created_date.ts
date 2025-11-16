import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemSetting";

/**
 * Test sorting system settings by creation date (created_at).
 *
 * This test validates that the system settings API correctly sorts results by
 * creation timestamp in both ascending and descending order. The moderator
 * first authenticates to establish an authenticated session, then queries the
 * system settings with sort_by='created_at' parameter using both ascending and
 * descending order values.
 *
 * The test workflow:
 *
 * 1. Register a new moderator account and authenticate
 * 2. Query system settings sorted by created_at in ascending order (oldest first)
 * 3. Validate that results are properly ordered from oldest to newest
 * 4. Query system settings sorted by created_at in descending order (newest first)
 * 5. Validate that results are properly ordered from newest to oldest
 * 6. Verify that the sorting produces consistent and expected orderings
 */
export async function test_api_system_settings_sort_by_created_date(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<100>
        >(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Query system settings sorted by created_at in ascending order
  const ascendingResult: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          sort_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Step 3: Validate ascending order (oldest to newest)
  if (ascendingResult.data.length > 1) {
    for (let i = 1; i < ascendingResult.data.length; i++) {
      const prevDate = new Date(ascendingResult.data[i - 1].createdAt);
      const currDate = new Date(ascendingResult.data[i].createdAt);
      TestValidator.predicate(
        "settings in ascending order should have createdAt increasing",
        prevDate <= currDate,
      );
    }
  }

  // Step 4: Query system settings sorted by created_at in descending order
  const descendingResult: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Step 5: Validate descending order (newest to oldest)
  if (descendingResult.data.length > 1) {
    for (let i = 1; i < descendingResult.data.length; i++) {
      const prevDate = new Date(descendingResult.data[i - 1].createdAt);
      const currDate = new Date(descendingResult.data[i].createdAt);
      TestValidator.predicate(
        "settings in descending order should have createdAt decreasing",
        prevDate >= currDate,
      );
    }
  }

  // Step 6: Verify pagination information is valid
  TestValidator.predicate(
    "ascending result should have valid pagination",
    ascendingResult.pagination.current > 0 &&
      ascendingResult.pagination.limit > 0 &&
      ascendingResult.pagination.records >= 0 &&
      ascendingResult.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "descending result should have valid pagination",
    descendingResult.pagination.current > 0 &&
      descendingResult.pagination.limit > 0 &&
      descendingResult.pagination.records >= 0 &&
      descendingResult.pagination.pages >= 0,
  );
}
