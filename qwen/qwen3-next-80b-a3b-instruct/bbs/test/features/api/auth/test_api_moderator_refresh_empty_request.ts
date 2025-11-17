import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";

export async function test_api_moderator_refresh_empty_request(
  connection: api.IConnection,
) {
  await TestValidator.error("empty request body should fail", async () => {
    await api.functional.auth.moderator.refresh(connection, {
      body: "" satisfies IEconomicBoardModerator.IRefresh,
    });
  });
}
