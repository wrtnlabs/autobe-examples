import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerationAction";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardModerationAction";

export async function test_api_moderation_actions_search_time_range_conflict(
  connection: api.IConnection,
) {
  /**
   * Test search with conflicting filters on time range. Moderator authenticates
   * via join and calls search endpoint with created_at_from set to future date
   * and created_at_to set to past date. System must handle as empty result set
   * without error and return empty array with correct pagination.
   *
   * The test must:
   *
   * 1. Authenticate as moderator using join endpoint
   * 2. Construct a search request with created_at_from set to a future date and
   *    created_at_to set to a past date
   * 3. Verify the response returns an empty array with valid pagination
   *    (current=1, limit=10, records=0, pages=0)
   * 4. Ensure no error is thrown despite the conflicting time range
   * 5. Confirm pagination structure matches IPage.IPagination specification
   */
  const moderator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator);

  const now = new Date();
  const futureDate = new Date(now.getTime() + 86400000).toISOString(); // 24 hours in the future
  const pastDate = new Date(now.getTime() - 86400000).toISOString(); // 24 hours in the past

  const response: IPageIEconomicBoardModerationAction.ISummary =
    await api.functional.economicBoard.moderator.moderation.actions.search(
      connection,
      {
        body: {
          created_at_from: futureDate, // Future date - should exclude all existing records
          created_at_to: pastDate, // Past date - should exclude all existing records
          limit: 10, // Explicitly set limit to match default behavior
        } satisfies IEconomicBoardModerationAction.IRequest,
      },
    );
  typia.assert(response);

  // Validate empty result with proper pagination
  TestValidator.equals("empty data array", response.data.length, 0);
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.equals("pagination records", response.pagination.records, 0);
  TestValidator.equals("pagination pages", response.pagination.pages, 0);
}
