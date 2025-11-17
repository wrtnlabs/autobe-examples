import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";

export async function test_api_citizen_token_refresh_after_admin_join(
  connection: api.IConnection,
) {
  const admin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicBoardModerator.ICreate,
  });
  typia.assert(admin);

  // Use the admin's refresh token to attempt citizen refresh (should fail)
  await TestValidator.error(
    "admin refresh token cannot be used for citizen refresh",
    async () => {
      await api.functional.auth.citizen.refresh(connection, {
        body: {
          refresh_token: admin.token.refresh,
        } satisfies IEconomicBoardCitizen.IRefresh,
      });
    },
  );
}
