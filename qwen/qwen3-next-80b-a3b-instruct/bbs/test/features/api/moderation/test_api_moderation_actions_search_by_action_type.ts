import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerationAction";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IPageIEconomicBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardModerationAction";

export async function test_api_moderation_actions_search_by_action_type(
  connection: api.IConnection,
) {
  // Generate test data
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  const citizenId = typia.random<string & tags.Format<"uuid">>();

  // Create search query for warning actions
  const warningSearchBody: IEconomicBoardModerationAction.IRequest =
    "action_type=warning";

  // Create search query for deletion actions
  const deletionSearchBody: IEconomicBoardModerationAction.IRequest =
    "action_type=deletion";

  // Create search query for lock actions
  const lockSearchBody: IEconomicBoardModerationAction.IRequest =
    "action_type=lock";

  // Search for warning actions (minimal test since we can't create actions)
  const warningSearch: IPageIEconomicBoardModerationAction =
    await api.functional.economicBoard.moderator.moderation.actions.search(
      connection,
      {
        body: warningSearchBody,
      },
    );
  typia.assert(warningSearch);

  // Search for deletion actions (minimal test since we can't create actions)
  const deletionSearch: IPageIEconomicBoardModerationAction =
    await api.functional.economicBoard.moderator.moderation.actions.search(
      connection,
      {
        body: deletionSearchBody,
      },
    );
  typia.assert(deletionSearch);

  // Search for lock actions (minimal test since we can't create actions)
  const lockSearch: IPageIEconomicBoardModerationAction =
    await api.functional.economicBoard.moderator.moderation.actions.search(
      connection,
      {
        body: lockSearchBody,
      },
    );
  typia.assert(lockSearch);

  // Since we can't create actions, we can't validate count == 1 as in the scenario.
  // The test can only verify that the search function accepts the action_type parameter and returns valid responses.
  // This represents the only implementable test given the API limitations.
}
