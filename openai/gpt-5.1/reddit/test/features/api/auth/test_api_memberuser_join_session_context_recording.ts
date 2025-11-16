import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that memberUser join captures credentials and creates an initial
 * authorized session with a coherent token bundle.
 *
 * Business intent:
 *
 * - Ensure POST /auth/memberUser/join successfully creates a new
 *   community_platform_memberusers row based on the provided username, email,
 *   and password.
 * - Ensure the join flow also creates an initial session logically backed by
 *   community_platform_memberuser_sessions and that this session issues a
 *   coherent IAuthorizationToken bundle.
 *
 * Steps:
 *
 * 1. Build an explicit ICommunityPlatformMemberuser.IJoin payload with:
 *
 *    - Username: stable, random-like handle
 *    - Email: syntactically valid, unique email
 *    - Password: strong-enough random string (>= 8 chars)
 *    - Ip: explicitly null to exercise server-derived-IP behavior path
 *    - Href: a deterministic URI string representing the registration page
 *    - Referrer: a deterministic URI string representing the referrer page
 * 2. Call api.functional.auth.memberUser.join with the payload.
 * 3. Use typia.assert to validate that the response conforms to
 *    ICommunityPlatformMemberuser.IAuthorized, including the embedded
 *    IAuthorizationToken.
 * 4. Assert that key identity fields (id, username, email) in the response align
 *    with the request and that initial account state flags reflect a brand-new
 *    account (not email-verified, not suspended, not banned, no failed login
 *    history, no lockout and not soft-deleted).
 * 5. Assert that the returned token bundle has non-empty access/refresh token
 *    strings and well-formed expiration timestamps.
 */
export async function test_api_memberuser_join_session_context_recording(
  connection: api.IConnection,
) {
  // 1. Build a deterministic-like join payload with explicit session context.
  const href: string & tags.Format<"uri"> = "https://app.example.com/signup";
  const referrer: string & tags.Format<"uri"> =
    "https://landing.example.com/campaign/new-members";

  const usernameBase: string = RandomGenerator.alphabets(8);
  const username: string & tags.MinLength<3> & tags.MaxLength<32> = `${
    usernameBase
  }_${RandomGenerator.alphaNumeric(4)}` as string &
    tags.MinLength<3> &
    tags.MaxLength<32>;

  const emailLocal: string = RandomGenerator.alphaNumeric(10);
  const email: string & tags.Format<"email"> =
    `${emailLocal}@test-community.local` as string & tags.Format<"email">;

  const passwordCore: string = RandomGenerator.alphaNumeric(10);
  const password: string & tags.MinLength<8> = passwordCore as string &
    tags.MinLength<8>;

  const joinBody = {
    username,
    email,
    password,
    ip: null,
    href,
    referrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  // 2. Call join endpoint.
  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });

  // 3. Structural type validation of the response, including token bundle.
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 4. Business assertions on identity and initial account state.
  TestValidator.equals(
    "username in response must match request payload",
    authorized.username,
    username,
  );
  TestValidator.equals(
    "email in response must match request payload",
    authorized.email,
    email,
  );

  TestValidator.equals(
    "new account must not be email-verified initially",
    authorized.is_email_verified,
    false,
  );
  TestValidator.equals(
    "new account must not be suspended",
    authorized.is_suspended,
    false,
  );
  TestValidator.equals(
    "new account must not be banned",
    authorized.is_banned,
    false,
  );

  TestValidator.equals(
    "failed_login_count must be initialized to 0",
    authorized.failed_login_count,
    0,
  );

  TestValidator.equals(
    "locked_until must be null or undefined for a fresh account",
    authorized.locked_until ?? null,
    null,
  );

  TestValidator.equals(
    "deleted_at must be null or undefined for a non-deleted account",
    authorized.deleted_at ?? null,
    null,
  );

  // 5. Token bundle coherence: non-empty strings and valid timestamps are
  // already enforced by typia.assert via IAuthorizationToken tags. Here we
  // focus on simple non-empty semantics.
  const token: IAuthorizationToken = authorized.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token string must be non-empty",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token string must be non-empty",
    token.refresh.length > 0,
  );
}
