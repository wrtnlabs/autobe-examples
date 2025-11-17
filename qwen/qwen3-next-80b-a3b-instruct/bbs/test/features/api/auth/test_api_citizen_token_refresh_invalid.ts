import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_token_refresh_invalid(
  connection: api.IConnection,
) {
  // Test with empty refresh token
  await TestValidator.error("empty refresh token should fail", async () => {
    await api.functional.auth.citizen.refresh(connection, {
      body: { refresh_token: "" } satisfies IEconomicBoardCitizen.IRefresh,
    });
  });

  // Test with malformed refresh token (non-UUID string)
  await TestValidator.error("malformed refresh token should fail", async () => {
    await api.functional.auth.citizen.refresh(connection, {
      body: {
        refresh_token: "invalid-refresh-token-123",
      } satisfies IEconomicBoardCitizen.IRefresh,
    });
  });

  // Test with random string refresh token
  await TestValidator.error(
    "random string refresh token should fail",
    async () => {
      await api.functional.auth.citizen.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(64),
        } satisfies IEconomicBoardCitizen.IRefresh,
      });
    },
  );

  // Test with a valid refresh token from another user
  const user1: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.refresh(connection, {
      body: typia.random<IEconomicBoardCitizen.IRefresh>(),
    });
  typia.assert(user1);

  const user2: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.refresh(connection, {
      body: typia.random<IEconomicBoardCitizen.IRefresh>(),
    });
  typia.assert(user2);

  await TestValidator.error(
    "refresh token from different user should fail",
    async () => {
      await api.functional.auth.citizen.refresh(connection, {
        body: {
          refresh_token: user1.token.refresh,
        } satisfies IEconomicBoardCitizen.IRefresh,
      });
    },
  );
}
