import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackGuest";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest token refresh with expired invitation scenario.
 *
 * Validates the guest token refresh flow and verifies that the system properly handles guest session management. This test accepts a guest invitation to create an initial session, then attempts to refresh the tokens to ensure the refresh mechanism works correctly.
 *
 * The test focuses on validating the business logic of guest session management, including proper token generation, guest information retrieval, and session state validation. While the actual invitation expiration scenario requires database manipulation beyond E2E scope, this test validates the refresh endpoint behavior and response structure.
 *
 * 1. Guest accepts invitation and creates initial session with refresh token.
 * 2. Extract refresh token from the authorization response.
 * 3. Attempt to refresh the guest session using the refresh token.
 * 4. Validate that the refresh operation returns proper authorization tokens.
 * 5. Verify guest information is correctly maintained in the response.
 * 6. Test error handling with invalid refresh token scenario.
 */
export async function test_api_guest_refresh_with_expired_invitation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and accept invitation
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      invitationToken: RandomGenerator.alphaNumeric(32),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResponse);
  // 2. Extract refresh token from join response
  const refreshToken = joinResponse.token.refresh;
  // 3. Create new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Attempt to refresh the guest session
  const refreshResponse = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IHrmTimeTrackGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  // 5. Validate refresh response structure
  TestValidator.equals(
    "guest id maintained",
    refreshResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "email maintained",
    refreshResponse.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "status maintained",
    refreshResponse.status,
    joinResponse.status,
  );
  // 6. Validate new tokens are generated
  TestValidator.notEquals(
    "access token updated",
    refreshResponse.token.access,
    joinResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token updated",
    refreshResponse.token.refresh,
    joinResponse.token.refresh,
  );
  // 7. Validate token expiration times are in the future
  const now = new Date();
  const newExpiredAt = new Date(refreshResponse.token.expired_at);
  const newRefreshableUntil = new Date(refreshResponse.token.refreshable_until);
  TestValidator.predicate(
    "access token expired_at in future",
    newExpiredAt > now,
  );
  TestValidator.predicate(
    "refreshable_until in future",
    newRefreshableUntil > now,
  );
  // 8. Test error handling with invalid refresh token
  const errorConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("invalid refresh token rejected", async () => {
    await authorize_guest_refresh(errorConnection, {
      body: {
        refresh_token: "invalid_token_12345",
      } satisfies IHrmTimeTrackGuest.IRefresh,
    });
  });
}
