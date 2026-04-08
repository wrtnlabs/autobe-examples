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
 * Test the primary success path for guest session token refresh.
 *
 * Validates the complete guest token refresh workflow including initial invitation acceptance and subsequent token renewal. Ensures that guests can maintain authenticated access without interruption during the invitation acceptance process.
 *
 * Special attention is given to verifying that the refresh operation returns new tokens with extended expiration times, and that all guest identity information (id, email, status) along with organization and role details are correctly included in the response.
 *
 * 1. Accept a guest invitation with valid email and invitation token, creating initial session.
 * 2. Extract the refresh token from the join response.
 * 3. Call the refresh endpoint with the refresh token.
 * 4. Validate the response contains new tokens with updated expiration timestamps.
 * 5. Verify guest identity information is correctly returned in the response.
 * 6. Confirm organization and role details are nested in the response.
 */
export async function test_api_guest_refresh_valid_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Accept guest invitation and create initial session
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      invitationToken: RandomGenerator.alphaNumeric(32),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackGuest.IJoin,
  });
  typia.assert(joinResponse);
  // Store original values for comparison
  const originalExpiredAt = joinResponse.token.expired_at;
  const originalRefreshToken = joinResponse.token.refresh;
  const guestId = joinResponse.id;
  const guestEmail = joinResponse.email;
  // 2. Extract refresh token from join response
  const refreshToken = joinResponse.token.refresh;
  // 3. Call refresh endpoint with the refresh token
  const refreshResponse = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IHrmTimeTrackGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Validate business logic - token refresh extended the session
  TestValidator.notEquals(
    "expired_at was extended",
    refreshResponse.token.expired_at,
    originalExpiredAt,
  );
  // 5. Verify guest identity matches between join and refresh
  TestValidator.equals("guest id matches", refreshResponse.id, guestId);
  TestValidator.equals(
    "guest email matches",
    refreshResponse.email,
    guestEmail,
  );
  // 6. Verify token rotation - new refresh token is different
  TestValidator.notEquals(
    "refresh token was rotated",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );
  // 7. Verify connection was updated with new access token
  TestValidator.equals(
    "Authorization header matches new access token",
    guestConnection.headers?.Authorization,
    refreshResponse.token.access,
  );
  // 8. Verify organization and role are consistent
  TestValidator.equals(
    "organization id is consistent",
    refreshResponse.organization.id,
    joinResponse.organization.id,
  );
  TestValidator.equals(
    "role id is consistent",
    refreshResponse.role.id,
    joinResponse.role.id,
  );
}
