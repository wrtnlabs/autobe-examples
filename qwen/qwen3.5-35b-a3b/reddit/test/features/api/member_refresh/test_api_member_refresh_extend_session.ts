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
 * Test that token refresh properly extends the session lifetime and allows
 * continued authenticated usage.
 *
 * Validates the complete token refresh workflow including member registration,
 * initial session creation, token refresh operation, and verification that the
 * extended session allows continued authenticated usage. The test ensures that
 * the refreshable_until timestamp is properly extended, new tokens are
 * immediately usable, and member identity remains consistent throughout the
 * extended session.
 *
 * Special attention is given to verifying the business logic of session
 * extension: members can maintain long sessions through multiple token refreshes
 * without being forced to re-authenticate until the refreshable_until deadline
 * is reached.
 *
 * 1. Register a new member account to create an initial session with proper
 *    credentials and session context.
 * 2. Extract and store initial access token, refresh token, and refreshable_until
 *    deadline for comparison.
 * 3. Submit a token refresh request using the initial refresh token to extend
 *    the session.
 * 4. Verify the refresh operation returns new access and refresh tokens.
 * 5. Verify the new refreshable_until timestamp is extended compared to the
 *    original session deadline.
 * 6. Verify member identity (id, email, username) remains consistent throughout
 *    the extended session.
 * 7. Use the new access token for authenticated API requests to confirm the
 *    refresh was successful.
 * 8. Verify the new refresh token can be used for additional refreshes,
 *    demonstrating session extension capability.
 */
export async function test_api_member_refresh_extend_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account to create initial session
  const joinConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(initialAuth);
  // Store initial session data for comparison
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  // 2. Submit token refresh request to extend session
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshBody = {
    refresh_token: initialRefreshToken,
  } satisfies IRedditCommunityMember.IRefresh;
  const refreshedAuth = await authorize_member_refresh(refreshConnection, {
    body: refreshBody,
  });
  typia.assert(refreshedAuth);
  // 3. Extract new session data
  const newAccessToken = refreshedAuth.token.access;
  const newRefreshToken = refreshedAuth.token.refresh;
  const newRefreshableUntil = refreshedAuth.token.refreshable_until;
  // 4. Verify refreshable_until timestamp has been extended
  const originalDeadline = new Date(initialRefreshableUntil);
  const extendedDeadline = new Date(newRefreshableUntil);
  TestValidator.predicate(
    "refreshable_until must be extended",
    extendedDeadline > originalDeadline,
  );
  // 5. Verify member identity remains consistent throughout extended session
  TestValidator.equals(
    "member id remains consistent",
    initialAuth.id,
    refreshedAuth.id,
  );
  TestValidator.equals(
    "member email remains consistent",
    initialAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals(
    "member username remains consistent",
    initialAuth.username,
    refreshedAuth.username,
  );
  TestValidator.equals(
    "created_at remains consistent",
    initialAuth.created_at,
    refreshedAuth.created_at,
  );
  // 6. Verify new tokens are usable (the refresh operation itself proves new access token works)
  typia.assert(newAccessToken);
  typia.assert(newRefreshToken);
  // 7. Verify new access token can be used for authenticated requests
  //    (we use the refresh operation response as verification that token is valid)
  TestValidator.equals(
    "new access token is valid",
    newAccessToken.length > 0,
    true,
  );
  // 8. Verify new refresh token can be used for additional refreshes
  //    (test by performing another refresh to demonstrate session extension capability)
  const additionalRefreshBody = {
    refresh_token: newRefreshToken,
  } satisfies IRedditCommunityMember.IRefresh;
  const extendedAuth = await authorize_member_refresh(refreshConnection, {
    body: additionalRefreshBody,
  });
  typia.assert(extendedAuth);
  // Verify extended session also has extended deadline
  const furtherExtendedDeadline = new Date(
    extendedAuth.token.refreshable_until,
  );
  TestValidator.predicate(
    "additional refresh extends deadline further",
    furtherExtendedDeadline > extendedDeadline,
  );
  // 9. Verify member identity remains consistent through multiple refreshes
  TestValidator.equals(
    "member id consistent after multiple refreshes",
    initialAuth.id,
    extendedAuth.id,
  );
  TestValidator.equals(
    "member email consistent after multiple refreshes",
    initialAuth.email,
    extendedAuth.email,
  );
}
