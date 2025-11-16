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
 * Test sorting system settings by modification timestamp in ascending and
 * descending order.
 *
 * Validates that the system settings API correctly orders results by the
 * updated_at field. A moderator authenticates with the system, then queries
 * settings with sort_by='updated_at' parameter using both ascending and
 * descending sort directions. The test verifies that:
 *
 * 1. Settings are returned in correct temporal order when sorting ascending
 *    (oldest first)
 * 2. Settings are returned in correct temporal order when sorting descending
 *    (newest first)
 * 3. The sort_by and order parameters are properly applied to the result set
 * 4. All returned settings are properly validated with complete data
 *
 * Business context: Configuration settings in the discussion board system have
 * modification timestamps that track when each setting was last updated.
 * Moderators need to view settings sorted by modification date to identify
 * recently changed configurations and track configuration history. This test
 * ensures the sorting functionality works correctly for audit and management
 * purposes.
 */
export async function test_api_system_settings_sort_by_updated_date(
  connection: api.IConnection,
) {
  // 1. Register a new moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Query settings with sort_by='updated_at' and order='asc' (ascending order - oldest first)
  const settingsAscending: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          sort_by: "updated_at",
          order: "asc",
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(settingsAscending);

  // 3. Verify ascending order - settings should be ordered from oldest to newest
  if (settingsAscending.data.length > 1) {
    for (let i = 0; i < settingsAscending.data.length - 1; i++) {
      const current = new Date(settingsAscending.data[i].updatedAt).getTime();
      const next = new Date(settingsAscending.data[i + 1].updatedAt).getTime();
      TestValidator.predicate(
        "ascending order: current setting updated_at should be <= next setting updated_at",
        current <= next,
      );
    }
  }

  // 4. Query settings with sort_by='updated_at' and order='desc' (descending order - newest first)
  const settingsDescending: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          sort_by: "updated_at",
          order: "desc",
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(settingsDescending);

  // 5. Verify descending order - settings should be ordered from newest to oldest
  if (settingsDescending.data.length > 1) {
    for (let i = 0; i < settingsDescending.data.length - 1; i++) {
      const current = new Date(settingsDescending.data[i].updatedAt).getTime();
      const next = new Date(settingsDescending.data[i + 1].updatedAt).getTime();
      TestValidator.predicate(
        "descending order: current setting updated_at should be >= next setting updated_at",
        current >= next,
      );
    }
  }

  // 6. Verify that descending and ascending results are reverse order of each other
  if (settingsAscending.data.length === settingsDescending.data.length) {
    const ascendingIds = settingsAscending.data.map((s) => s.id);
    const descendingIds = settingsDescending.data.map((s) => s.id);
    const descendingIdsReversed = [...descendingIds].reverse();

    TestValidator.equals(
      "descending order reversed should match ascending order",
      ascendingIds,
      descendingIdsReversed,
    );
  }

  // 7. Verify that pagination information is present and valid
  TestValidator.predicate(
    "ascending pagination current page should be >= 0",
    settingsAscending.pagination.current >= 0,
  );
  TestValidator.predicate(
    "ascending pagination limit should be > 0",
    settingsAscending.pagination.limit > 0,
  );
  TestValidator.predicate(
    "descending pagination current page should be >= 0",
    settingsDescending.pagination.current >= 0,
  );
  TestValidator.predicate(
    "descending pagination limit should be > 0",
    settingsDescending.pagination.limit > 0,
  );
}
