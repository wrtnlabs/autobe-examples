import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardContentFlag";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardContentFlag";

export async function test_api_content_flag_list_retrieval_rejected_for_unauthenticated(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "unauthenticated user cannot retrieve content flag list",
    async () => {
      await api.functional.economicBoard.moderator.settings.contentFlags.index(
        connection,
      );
    },
  );
}
