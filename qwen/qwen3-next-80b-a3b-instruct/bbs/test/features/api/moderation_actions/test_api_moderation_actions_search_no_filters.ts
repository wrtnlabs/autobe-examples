import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerationAction";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardModerationAction";

export async function test_api_moderation_actions_search_no_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "securePassword123",
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Search for all moderation actions with empty request body (no filters)
  const actionsPage: IPageIEconomicBoardModerationAction.ISummary =
    await api.functional.economicBoard.moderator.moderation.actions.search(
      connection,
      {
        body: {} satisfies IEconomicBoardModerationAction.IRequest,
      },
    );
  typia.assert(actionsPage);

  // Step 3: Validate pagination structure
  TestValidator.equals("pagination exists", actionsPage.pagination, {
    current: 1,
    limit: actionsPage.pagination.limit,
    records: actionsPage.pagination.records,
    pages: Math.ceil(
      actionsPage.pagination.records / actionsPage.pagination.limit,
    ),
  });

  // Step 4: Validate data array is present and contains ISummary items
  TestValidator.predicate("data array has items", actionsPage.data.length > 0);

  // Step 5: Validate pages = ceil(records / limit)
  TestValidator.equals(
    "pages = ceil(records / limit)",
    actionsPage.pagination.pages,
    Math.ceil(actionsPage.pagination.records / actionsPage.pagination.limit),
  );
}
