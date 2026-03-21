import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the token refresh endpoint with a valid refresh token obtained from member registration.
 *
 * Steps:
 * 1. Register a new member via POST /auth/member/join to obtain access and refresh tokens
 * 2. Extract the refresh token from the response
 * 3. Call POST /auth/member/refresh with the valid refresh token in the request body
 * 4. Verify the response returns a new authorized response containing: new access token, new refresh token, member ID, username, email, and profile information
 * 5. Verify the new tokens are different from the original tokens
 * 6. Verify the new access token can be used for authenticated requests
 *
 * This validates the primary success path for session continuity without re-authentication.
 */
export async function test_api_member_session_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(initialResponse);
  // Extract original tokens
  const originalAccessToken = initialResponse.token.access;
  const originalRefreshToken = initialResponse.token.refresh;
  const originalMemberId = initialResponse.id;
  const originalUsername = initialResponse.username;
  const originalEmail = initialResponse.email;
  // 2. Extract the refresh token from the response
  const refreshToken = initialResponse.token.refresh;
  // 3. Call POST /auth/member/refresh with the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await api.functional.redditClone.auth.member.refresh(
    refreshConnection,
    {
      body: {
        refreshToken: refreshToken,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMemberSession.IRefresh,
    },
  );
  typia.assert(refreshResponse);
  // 4. Verify the response returns new authorized response with all required fields
  TestValidator.equals(
    "member ID preserved",
    refreshResponse.id,
    originalMemberId,
  );
  TestValidator.equals(
    "username preserved",
    refreshResponse.username,
    originalUsername,
  );
  TestValidator.equals("email preserved", refreshResponse.email, originalEmail);
  TestValidator.predicate("has profile", !!refreshResponse.profile);
  TestValidator.predicate("has karma", !!refreshResponse.karma);
  TestValidator.predicate("has token", !!refreshResponse.token);
  // 5. Verify the new tokens are different from the original tokens
  TestValidator.notEquals(
    "new access token differs",
    refreshResponse.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );
  // Verify new tokens have proper structure
  TestValidator.predicate(
    "new access token is non-empty string",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is non-empty string",
    refreshResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expiration timestamp",
    !!refreshResponse.token.expired_at,
  );
  TestValidator.predicate(
    "has refreshable until timestamp",
    !!refreshResponse.token.refreshable_until,
  );
  // 6. Verify the new access token can be used for authenticated requests
  // The refresh function already updates the connection headers with the new access token
  // We can verify this by checking the connection headers were updated
  TestValidator.predicate(
    "connection has authorization header",
    !!refreshConnection.headers?.Authorization,
  );
  TestValidator.equals(
    "authorization header contains new access token",
    refreshConnection.headers?.Authorization,
    refreshResponse.token.access,
  );
}
