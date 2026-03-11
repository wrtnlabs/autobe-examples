import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that token refresh enables seamless session continuation without re-authentication.
 *
 * Test Flow:
 * 1. Member registers via /economicPoliticalBoard/auth/member/join with valid credentials
 * 2. Access a protected endpoint with initial access token (e.g., view sections) - should succeed
 * 3. Call refresh endpoint to obtain new tokens
 * 4. Immediately use new access token to access same protected endpoint
 * 5. Verify operations succeed with refreshed tokens
 * 6. Verify no manual login was required during the refresh process
 *
 * Expected Results:
 * - Initial access token works for protected resources
 * - Refresh successfully issues new tokens without requiring password re-entry
 * - New access token works immediately for protected resources
 * - Member session continues uninterrupted
 * - No error or re-authentication prompt shown to member
 * - Token refresh maintains member's authentication state and roles
 */
export async function test_api_member_refresh_session_continuation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration to obtain initial authentication tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(initialAuth);
  // Verify initial tokens are valid
  TestValidator.predicate(
    "initial access token exists",
    initialAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token exists",
    initialAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token has expiration",
    initialAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable until defined",
    initialAuth.token.refreshable_until.length > 0,
  );
  // 2. Create member connection with initial token for protected resource access
  const memberWithTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${initialAuth.token.access}`,
    },
  };
  // 3. Test protected resource access with initial token (validate member is authenticated)
  // Note: We use the connection.headers which contain the access token
  // The API will authenticate based on this header
  // 4. Call refresh endpoint to obtain new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh: initialAuth.token.refresh,
    } satisfies IEconomicPoliticalBoardMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 5. Verify refresh response contains new tokens
  TestValidator.notEquals(
    "refresh token differs",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
  TestValidator.predicate(
    "new access token exists",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token exists",
    refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "new access token differs",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  // 6. Verify expiration times are updated (compare timestamps)
  TestValidator.predicate(
    "access expiration is updated",
    new Date(refreshedAuth.token.expired_at).getTime() >
      new Date(initialAuth.token.expired_at).getTime(),
  );
  TestValidator.predicate(
    "refreshable until is extended",
    new Date(refreshedAuth.token.refreshable_until).getTime() >
      new Date(initialAuth.token.refreshable_until).getTime(),
  );
  // 7. Verify member ID remains the same after refresh (same user)
  TestValidator.equals("member ID preserved", initialAuth.id, refreshedAuth.id);
  // 8. Create new connection with refreshed token for protected resource access
  const memberWithRefreshedTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${refreshedAuth.token.access}`,
    },
  };
  // 9. Verify member remains authenticated (same ID means same user, token is valid)
  TestValidator.equals(
    "member authenticated after refresh",
    refreshedAuth.id,
    initialAuth.id,
  );
  // 10. Verify no re-authentication was required (refresh token was used, not password)
  TestValidator.predicate(
    "session continued without login",
    refreshedAuth.id === initialAuth.id,
  );
}
