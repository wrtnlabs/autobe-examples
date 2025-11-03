import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";

export async function test_api_community_member_password_change_by_member(
  connection: api.IConnection,
) {
  /**
   * Validate community member password change and observable session revocation
   * signal.
   *
   * Flow:
   *
   * 1. Register a new community member (join) and capture the issued authorization
   *    token and persisted session summary returned by the server.
   * 2. Using the authenticated context (SDK manages Authorization header), call
   *    the password change endpoint with revokeSessions=true.
   * 3. Assert the response IMessage indicates password changed and/or sessions
   *    revoked and that tokens/sessions were present before the change.
   *
   * Limitation: The SDK does not expose a refresh endpoint nor a direct DB
   * client in the test template; therefore we cannot directly validate refresh
   * token rejection or inspect DB rows (password_hash, session.expired_at). The
   * test asserts observable business-level outputs instead.
   */

  // --- Prepare credentials ---
  const username = `${RandomGenerator.alphaNumeric(8)}`;
  const email = `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@example.test`;
  const initialPassword = `Aa1${RandomGenerator.alphaNumeric(6)}`; // meets policy

  // --- 1) Create member (join) ---
  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: {
        email,
        username,
        password: initialPassword,
        session_context: {
          href: "https://example.test/welcome",
          referrer: "https://example.test/ref",
          ip: null,
          session_ttl_seconds: null,
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(authorized);

  // Validate join returned expected shapes and values
  TestValidator.equals(
    "created member username matches",
    authorized.member.username,
    username,
  );
  typia.assert(authorized.token);
  typia.assert(authorized.session);
  TestValidator.predicate(
    "access token present after join",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present before change",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );

  // --- 2) Change password ---
  const newPassword = `Bb2${RandomGenerator.alphaNumeric(6)}`;
  const msg: ICommunityBbsCommunityMember.IMessage =
    await api.functional.auth.communityMember.password.change.changePassword(
      connection,
      {
        body: {
          currentPassword: initialPassword,
          newPassword,
          revokeSessions: true,
        } satisfies ICommunityBbsCommunityMember.IChangePassword,
      },
    );
  typia.assert(msg);

  // --- 3) Business-level assertions ---
  // The server should acknowledge password change and/or session revocation.
  TestValidator.predicate(
    "password change acknowledged with expected code",
    msg.code === "PASSWORD_CHANGED" || msg.code === "SESSIONS_REVOKED",
  );

  // Timestamp should exist (typia.assert already validated format if present)
  TestValidator.predicate(
    "acknowledgement timestamp exists or is undefined",
    msg.timestamp === undefined || typeof msg.timestamp === "string",
  );

  // Observability note: cannot validate DB rows or refresh token usage without
  // additional SDK endpoints (refresh) or direct DB access. The above checks
  // validate the end-to-end business signal available via the provided SDK.
}
