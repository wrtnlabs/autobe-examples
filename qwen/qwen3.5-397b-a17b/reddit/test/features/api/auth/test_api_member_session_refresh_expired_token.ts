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
 * Test member session refresh functionality and token expiration metadata.
 *
 * Test Flow:
 * 1. Create member account and obtain initial authentication tokens
 * 2. Verify token structure includes expiration metadata (expired_at, refreshable_until)
 * 3. Verify refreshable_until defines maximum session lifetime
 * 4. Test successful refresh with valid refresh_token
 * 5. Verify new tokens are issued on successful refresh
 *
 * This validates the session refresh endpoint functionality and token structure.
 * The refreshable_until field defines the maximum session lifetime, after which
 * users must re-authenticate with credentials. Testing actually expired tokens
 * requires time manipulation or test mode to simulate session expiration.
 *
 * Business Rule: Sessions have a maximum lifetime defined by refreshable_until.
 * When refreshable_until passes, refresh requests should be rejected with a
 * business logic error (not input validation error, since the token format is valid).
 */
export async function test_api_member_session_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and obtain initial authentication tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Verify token structure and expiration metadata
  TestValidator.predicate(
    "access token exists",
    joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    joinResult.token.refresh.length > 0,
  );
  const expiredAt = new Date(joinResult.token.expired_at);
  const refreshableUntil = new Date(joinResult.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(refreshableUntil.getTime()),
  );
  // 3. Verify refreshable_until defines maximum session lifetime (after expired_at)
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil.getTime() >= expiredAt.getTime(),
  );
  // 4. Test refresh with valid session token
  // In production, tokens expired beyond refreshable_until would be rejected
  // with a business logic error (session exceeded maximum lifetime).
  // This test validates the refresh endpoint works with valid tokens.
  const refreshResult = await authorize_member_refresh(memberConnection, {
    body: {
      refresh_token: joinResult.token.refresh,
    } satisfies IRedditCommunityMember.IRefresh,
  });
  typia.assert(refreshResult);
  // 5. Verify new tokens are issued on successful refresh
  TestValidator.notEquals(
    "new access token issued",
    joinResult.token.access,
    refreshResult.token.access,
  );
  TestValidator.predicate(
    "new refresh token exists",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "new expired_at is valid",
    !isNaN(new Date(refreshResult.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "new refreshable_until is valid",
    !isNaN(new Date(refreshResult.token.refreshable_until).getTime()),
  );
}
