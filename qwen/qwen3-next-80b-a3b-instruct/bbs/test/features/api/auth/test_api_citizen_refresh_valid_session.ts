import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_citizen_refresh_valid_session(
  connection: api.IConnection,
): Promise<void> {
  // Create a valid citizen session with refresh token in httpOnly cookie
  const citizenConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(joined);
  // Now use the same connection (with httpOnly cookie set) to refresh token
  const refreshed = await authorize_citizen_refresh(citizenConnection, {
    body: {} satisfies IEconomicBoardCitizen.IRefresh,
  });
  typia.assert(refreshed);
  // Validate that refresh returned a new, valid token
  TestValidator.notEquals(
    "new access token differs from old",
    joined.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from old",
    joined.token.refresh,
    refreshed.token.refresh,
  );
  // Validate expiration times are set correctly
  const accessExpiredAt = new Date(refreshed.token.expired_at);
  const refreshableUntil = new Date(refreshed.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate(
    "access token expires within 20-25 minutes",
    accessExpiredAt.getTime() - now.getTime() <= 25 * 60 * 1000,
  );
  TestValidator.predicate(
    "access token expires after at least 15 minutes",
    accessExpiredAt.getTime() - now.getTime() >= 15 * 60 * 1000,
  );
  TestValidator.predicate(
    "refresh token expires within 14 days",
    refreshableUntil.getTime() - now.getTime() <= 14 * 24 * 60 * 60 * 1000,
  );
  TestValidator.predicate(
    "refresh token expires after at least 13 days",
    refreshableUntil.getTime() - now.getTime() >= 13 * 24 * 60 * 60 * 1000,
  );
  // Verify the citizenConnection still has Authorization header set (session remains valid)
  TestValidator.predicate(
    "Authorization header is set after refresh",
    citizenConnection.headers?.Authorization !== undefined,
  );
  // CRITICAL: Verify old refresh token is invalidated
  // Attempt to refresh again using the old refresh token (from joined) - should fail
  const expiredConnection: api.IConnection = { host: connection.host };
  expiredConnection.headers = { Authorization: joined.token.access }; // set old access token
  // Use utility function as required
  await TestValidator.error(
    "old refresh token should be invalidated",
    async () => {
      await authorize_citizen_refresh(expiredConnection, {
        body: {} satisfies IEconomicBoardCitizen.IRefresh,
      });
    },
  );
  // Also validate the citizen connection can still use its new token
  const reRefreshed = await authorize_citizen_refresh(citizenConnection, {
    body: {} satisfies IEconomicBoardCitizen.IRefresh,
  });
  typia.assert(reRefreshed);
  TestValidator.notEquals(
    "second refresh produces different refresh token",
    refreshed.token.refresh,
    reRefreshed.token.refresh,
  );
}
