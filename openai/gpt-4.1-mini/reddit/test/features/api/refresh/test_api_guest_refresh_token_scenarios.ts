import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_token_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Successful token refresh for guest user
  // 1. Guest joins and obtains initial authorized tokens
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_guest_join(guestJoinConnection, {
    body: { deviceFingerprint: RandomGenerator.alphaNumeric(32) },
  });
  typia.assert(joinOutput);
  // 2. Guest refreshes token with the valid refresh token
  const guestRefreshConnection: api.IConnection = { host: connection.host };
  const refreshOutput = await authorize_guest_refresh(guestRefreshConnection, {
    body: { refreshToken: joinOutput.refresh },
  });
  typia.assert(refreshOutput);
  // Validate that new tokens are different from old tokens
  TestValidator.notEquals(
    "access token changed",
    refreshOutput.access,
    joinOutput.access,
  );
  TestValidator.notEquals(
    "refresh token changed",
    refreshOutput.refresh,
    joinOutput.refresh,
  );
  // Validate expiration timestamps have been updated
  TestValidator.predicate(
    "access expiration updated",
    Date.parse(refreshOutput.accessExpiredAt) >
      Date.parse(joinOutput.accessExpiredAt),
  );
  TestValidator.predicate(
    "refresh expiration updated",
    Date.parse(refreshOutput.refreshExpiredAt) >
      Date.parse(joinOutput.refreshExpiredAt),
  );
  // Validate guest metadata
  TestValidator.equals("guest id unchanged", refreshOutput.id, joinOutput.id);
  TestValidator.equals(
    "device fingerprint unchanged",
    refreshOutput.deviceFingerprint,
    joinOutput.deviceFingerprint,
  );
  TestValidator.predicate(
    "createdAt timestamp valid",
    Boolean(Date.parse(refreshOutput.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt timestamp valid",
    Boolean(Date.parse(refreshOutput.updatedAt)),
  );
  // 3. Use new access token to call a protected endpoint to verify token validity
  //    Try to call refresh endpoint itself (protected) using new access token
  const protectedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: refreshOutput.access },
  };
  const refreshValidationResult =
    await api.functional.communityPlatform.auth.guest.refresh(
      protectedConnection,
      {
        body: { refreshToken: refreshOutput.refresh },
      },
    );
  typia.assert(refreshValidationResult);
  // Scenario: Token refresh with expired or invalid refresh token
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh with invalid token returns 401",
    401,
    async () => {
      await authorize_guest_refresh(invalidRefreshConnection, {
        body: { refreshToken: "invalid-or-expired-token" },
      });
    },
  );
  // Scenario: Token refresh without providing a refresh token (null or missing)
  const missingTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh without refreshToken returns 401",
    401,
    async () => {
      await authorize_guest_refresh(missingTokenConnection, {
        body: { refreshToken: "" } as any,
      });
    },
  );
}
