import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate successful memberUser registration and initial authorization token
 * issuance.
 *
 * Business goal
 *
 * - Ensure that POST /auth/memberUser/join can turn an anonymous connection into
 *   an authenticated memberUser in a single call.
 * - Confirm that the created account state matches security expectations (no
 *   suspension or bans, zero failed login count, no lockout, no soft-delete).
 * - Confirm that an authorization token bundle is attached and structurally valid
 *   with future expiration timestamps.
 *
 * Test steps
 *
 * 1. Build a valid ICommunityPlatformMemberuser.IJoin request body:
 *
 *    - Username: random string between 3 and 32 characters
 *    - Email: random email string
 *    - Password: random string with length >= 8
 *    - Ip: omit to let server infer from transport (do not send explicit null unless
 *         desired)
 *    - Href: random valid URI string
 *    - Referrer: random valid URI string
 * 2. Call api.functional.auth.memberUser.join(connection, { body }) and await the
 *    result.
 * 3. Use typia.assert<ICommunityPlatformMemberuser.IAuthorized>(output) to fully
 *    validate the response structure and types.
 * 4. Perform business-logic assertions:
 *
 *    - TestValidator.predicate that output.username equals the requested username.
 *    - TestValidator.predicate that output.email equals the requested email.
 *    - TestValidator.predicate that output.is_suspended === false.
 *    - TestValidator.predicate that output.is_banned === false.
 *    - TestValidator.equals that output.failed_login_count is 0.
 *    - TestValidator.predicate that output.locked_until is null or undefined.
 *    - TestValidator.predicate that output.deleted_at is null or undefined.
 * 5. Validate token bundle fields (IAuthorizationToken):
 *
 *    - Access and refresh are non-empty strings.
 *    - Expired_at and refreshable_until parse as valid date-time strings.
 *    - Expired_at is in the future relative to current Date.now().
 *    - Refreshable_until is in the future and not before expired_at.
 *
 * Important constraints
 *
 * - Do not import anything beyond the provided template imports.
 * - Do not touch connection.headers in the test body (the SDK manages it).
 * - Do not purposefully send invalid types or omit required fields.
 * - Do not assert on specific HTTP status codes; rely on successful resolution.
 */
export async function test_api_memberuser_join_success(
  connection: api.IConnection,
) {
  // 1. Build valid join request body
  const username: string = RandomGenerator.alphabets(10); // 3-32 chars
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12); // >= 8

  const href: string = typia.random<string & tags.Format<"uri">>();
  const referrer: string = typia.random<string & tags.Format<"uri">>();

  const body = {
    username,
    email,
    password,
    href,
    referrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  // 2. Call join endpoint
  const output: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, { body });

  // 3. Structural validation
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(output);

  // 4. Business logic assertions about account state
  TestValidator.equals(
    "joined username should match request",
    output.username,
    username,
  );
  TestValidator.equals(
    "joined email should match request",
    output.email,
    email,
  );

  TestValidator.predicate(
    "newly joined account must not be suspended",
    output.is_suspended === false,
  );
  TestValidator.predicate(
    "newly joined account must not be banned",
    output.is_banned === false,
  );

  TestValidator.equals(
    "newly joined account failed_login_count must be 0",
    output.failed_login_count,
    0,
  );

  TestValidator.predicate(
    "locked_until should be null or undefined for new account",
    output.locked_until === null || output.locked_until === undefined,
  );

  TestValidator.predicate(
    "deleted_at should be null or undefined for new account",
    output.deleted_at === null || output.deleted_at === undefined,
  );

  // 5. Validate token bundle semantics
  const token: IAuthorizationToken = output.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token must be non-empty string",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token must be non-empty string",
    token.refresh.length > 0,
  );

  const now: number = Date.now();
  const expiredAtMs: number = new Date(token.expired_at).getTime();
  const refreshableUntilMs: number = new Date(
    token.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "expired_at must parse to a valid future timestamp",
    Number.isFinite(expiredAtMs) && expiredAtMs > now,
  );

  TestValidator.predicate(
    "refreshable_until must parse to a valid future timestamp",
    Number.isFinite(refreshableUntilMs) && refreshableUntilMs > now,
  );

  TestValidator.predicate(
    "refreshable_until must not be earlier than expired_at",
    refreshableUntilMs >= expiredAtMs,
  );
}
