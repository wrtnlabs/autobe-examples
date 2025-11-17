import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerationAction";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardModerationAction";

export async function test_api_moderation_actions_search_page_below_min(
  connection: api.IConnection,
) {
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPassword123!",
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator);

  await TestValidator.error("search with page=0 should fail", async () => {
    await api.functional.economicBoard.moderator.moderation.actions.search(
      connection,
      {
        body: {
          page: 0,
        } satisfies IEconomicBoardModerationAction.IRequest,
      },
    );
  });
}
