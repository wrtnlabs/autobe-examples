import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 1: Create guest session
  const guestSession = await authorize_guest_join(guestConnection, {
    body: {} satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(guestSession);
  // Step 2: Validate token structure
  const token = guestSession.token;
  typia.assert<IAuthorizationToken>(token);
  // Validate required fields
  TestValidator.equals("access token exists", typeof token.access, "string");
  TestValidator.equals("refresh token exists", typeof token.refresh, "string");
  TestValidator.predicate("access token is not empty", token.access.length > 0);
  TestValidator.predicate(
    "refresh token is not empty",
    token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is ISO date-time",
    new Date(token.expired_at).toISOString() === token.expired_at,
  );
  TestValidator.predicate(
    "refreshable_until is ISO date-time",
    new Date(token.refreshable_until).toISOString() === token.refreshable_until,
  );
  TestValidator.predicate(
    "refreshable_until after expired_at",
    new Date(token.refreshable_until) > new Date(token.expired_at),
  );
  // Step 3: Verify connection auth header was updated
  TestValidator.equals(
    "connection authorization header set",
    guestConnection.headers?.Authorization,
    token.access,
  );
  // Step 4: Use the token to make a subsequent call (optional: fetch public feed)
  // Note: No public feed endpoint is provided in requirements, so we validate the session creation itself
  // Step 5: Ensure we can't use the original connection directly (isolated connection pattern)
  // Original connection should not have authorization header
  TestValidator.equals(
    "original connection has no auth header",
    connection.headers?.Authorization,
    undefined,
  );
}
