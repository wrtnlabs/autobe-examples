import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVisitor";
import type { IVisitorConnectionContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IVisitorConnectionContext";
import type { IVisitorSessionContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IVisitorSessionContext";

/**
 * Test successful visitor token refresh to extend browsing sessions.
 *
 * Validates that visitors can receive new access tokens without
 * re-authentication, supporting seamless browsing experiences while maintaining
 * security through proper token rotation mechanisms.
 *
 * 1. Create visitor account and obtain initial authentication tokens
 * 2. Extract refresh token from authentication response
 * 3. Use refresh token to request new access tokens
 * 4. Validate new tokens are different from original tokens
 * 5. Verify token expiration timestamps are properly updated
 * 6. Confirm visitor identity remains consistent across refresh
 */
export async function test_api_visitor_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Create visitor account and obtain initial authentication tokens
  const visitorEmail = typia.random<string & tags.Format<"email">>();
  const visitorNickname = RandomGenerator.name();
  const visitorPassword = "visitor123";
  const currentUrl = "https://reddit-community.example.com/browse";
  const referrerUrl = "https://google.com/search?q=reddit+community";

  const visitorAuth = await api.functional.auth.visitor.join(connection, {
    body: {
      nickname: visitorNickname,
      email: visitorEmail,
      password: visitorPassword,
      href: currentUrl,
      referrer: referrerUrl,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      ip: "192.168.1.100",
    } satisfies IRedditCommunityVisitor.ICreate,
  });
  typia.assert(visitorAuth);

  // 2. Extract refresh token from authentication response
  const originalRefreshToken = visitorAuth.token.refresh;
  const originalAccessToken = visitorAuth.token.access;
  const originalExpiration = visitorAuth.token.expired_at;
  const visitorId = visitorAuth.visitor.id;

  // 3. Use refresh token to request new access tokens
  const refreshResponse = await api.functional.auth.visitor.refresh(
    connection,
    {
      body: {
        connection: {
          href: currentUrl,
          referrer: referrerUrl,
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ip: "192.168.1.100",
        },
      } satisfies IRedditCommunityVisitor.IRefresh,
    },
  );
  typia.assert(refreshResponse);

  // 4. Validate new tokens are different from original tokens
  TestValidator.notEquals(
    "new access token differs from original",
    refreshResponse.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );

  // 5. Verify token expiration timestamps are properly updated
  TestValidator.notEquals(
    "token expiration updated",
    refreshResponse.token.expired_at,
    originalExpiration,
  );
  TestValidator.predicate(
    "new expiration is in future",
    new Date(refreshResponse.token.expired_at) > new Date(),
  );

  // 6. Confirm visitor identity remains consistent across refresh
  TestValidator.equals(
    "visitor ID unchanged",
    refreshResponse.visitor.id,
    visitorId,
  );
  TestValidator.equals(
    "visitor nickname unchanged",
    refreshResponse.visitor.nickname,
    visitorNickname,
  );
  TestValidator.predicate(
    "session context maintained",
    refreshResponse.session.sessionId === visitorAuth.session.sessionId,
  );
}
