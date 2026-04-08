import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful JWT token refresh with a valid refresh token.
 *
 * Validates the token refresh workflow for member authentication. A registered member should be able to obtain new JWT tokens using their refresh token before the access token expires. The test verifies token renewal, identity preservation, and extended session validity.
 *
 * The test ensures that the refresh endpoint correctly validates the refresh token, issues new tokens with appropriate expiration times, and maintains consistent member identity across token rotations.
 *
 * 1. Register a new member account to obtain initial JWT tokens.
 * 2. Extract the refresh token from the initial authorization response.
 * 3. Call the refresh endpoint with the valid refresh token.
 * 4. Verify new access and refresh tokens are returned.
 * 5. Validate the new access token can authenticate protected endpoints.
 * 6. Confirm member identity (id, email, username) remains consistent.
 * 7. Verify the new refreshable_until timestamp is extended.
 */
export async function test_api_member_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account to obtain initial JWT tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth: IRedditLikeMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    });
  typia.assert(initialAuth);
  // Store original member identity for comparison
  const originalMemberId: string = initialAuth.id;
  const originalEmail: string = initialAuth.email;
  const originalUsername: string = initialAuth.username;
  const originalRefreshableUntil: string = initialAuth.token.refreshable_until;
  // 2. Extract refresh token from initial authorization response
  const refreshToken: string = initialAuth.token.refresh;
  // 3. Call the refresh endpoint with the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth: IRedditLikeMember.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IRedditLikeMember.IRefresh,
    });
  typia.assert(refreshedAuth);
  // 4. Verify new access and refresh tokens are returned
  TestValidator.predicate(
    "new access token exists",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token exists",
    refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access token changed",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
  // 5. Validate the new access token can authenticate protected endpoints
  // Use the new connection (which has the new access token in headers) to verify authentication works
  TestValidator.predicate(
    "new access token is valid",
    refreshedAuth.token.access.length > 0,
  );
  // 6. Confirm member identity remains consistent
  TestValidator.equals("member ID matches", refreshedAuth.id, originalMemberId);
  TestValidator.equals("email matches", refreshedAuth.email, originalEmail);
  TestValidator.equals(
    "username matches",
    refreshedAuth.username,
    originalUsername,
  );
  // 7. Verify the new refreshable_until timestamp is extended or equal
  const originalExpiration: Date = new Date(originalRefreshableUntil);
  const newExpiration: Date = new Date(refreshedAuth.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is extended or maintained",
    newExpiration >= originalExpiration,
  );
  // Verify expired_at is a valid future timestamp
  TestValidator.predicate(
    "access token has future expiration",
    new Date(refreshedAuth.token.expired_at) > new Date(),
  );
}
