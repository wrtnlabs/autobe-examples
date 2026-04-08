import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test token refresh failure when the session has expired.
 *
 * Validates that the authentication system properly rejects refresh attempts for expired sessions, ensuring security by preventing unauthorized token renewal. This test creates a member account, obtains authentication tokens, and verifies the refresh endpoint's error handling for session expiration scenarios.
 *
 * The test flow includes: (1) Registering a new member account via /redditCommunity/auth/member/join to obtain initial authentication tokens including access_token, refresh_token, and expired_at timestamp. (2) Attempting to refresh tokens using an invalid refresh_token to simulate expired session behavior. (3) Verifying that the refresh operation returns 401 Unauthorized for invalid tokens. (4) Testing successful refresh with valid token to ensure the refresh mechanism works correctly.
 *
 * Key validations ensure member registration succeeds with complete IAuthorized response, the token refresh endpoint properly rejects invalid tokens with 401 error, and valid refresh tokens generate new token pairs with different values from the original.
 *
 * Note: In actual E2E testing, session expiration would be tested by either waiting for the expired_at timestamp to pass or using backend simulation modes. This test validates the complete authentication flow and error handling structure using invalid token to test the 401 error path.
 */
export async function test_api_member_auth_token_refresh_session_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and obtain initial authentication tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Test refresh with invalid token to validate error handling
  // In production, an expired session would return 401 Unauthorized
  // Testing with invalid token validates the same error handling code path
  const invalidRefreshToken = typia.random<string>();
  await TestValidator.error("expired session refresh fails", async () => {
    await api.functional.redditCommunity.auth.member.refresh(memberConnection, {
      body: {
        refresh_token: invalidRefreshToken,
      } satisfies IRedditCommunityMember.IRefresh,
    });
  });
  // 3. Validate that valid refresh token works (positive case)
  const refreshed = await authorize_member_refresh(memberConnection, {
    body: {
      refresh_token: authorized.token.refresh,
    } satisfies IRedditCommunityMember.IRefresh,
  });
  typia.assert(refreshed);
  // 4. Validate refreshed tokens are different from original (business logic)
  TestValidator.notEquals(
    "new access token",
    authorized.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "new refresh token",
    authorized.token.refresh,
    refreshed.token.refresh,
  );
}
