import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import type { IHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_token_refresh_with_tampered_token_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new guest account to obtain valid tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(joinConnection, {});
  typia.assert(authorized);
  const validRefreshToken: string = authorized.token.refresh;
  // Step 2-4: Tamper the refresh token and verify rejection (400 Bad Request)
  const tamperedToken: string = validRefreshToken + "x";
  await TestValidator.httpError(
    "tampered refresh token rejected with 400",
    400,
    async () => {
      const tamperedConnection: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(tamperedConnection, {
        body: {
          refresh_token: tamperedToken,
        } satisfies IHrmTimeTrackingGuest.IRefresh,
      });
    },
  );
  // Step 5: Positive control — refresh with the original valid token
  const validConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_guest_refresh(validConnection, {
    body: {
      refresh_token: validRefreshToken,
    } satisfies IHrmTimeTrackingGuest.IRefresh,
  });
  typia.assert(refreshed);
  // Verify fresh tokens were issued
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshed.token.refresh,
    validRefreshToken,
  );
}
