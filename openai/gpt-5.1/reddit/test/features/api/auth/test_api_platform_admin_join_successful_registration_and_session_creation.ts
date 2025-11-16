import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate successful platform admin registration and authenticated session
 * creation.
 *
 * This test ensures that a new platform administrator can register through the
 * POST /auth/platformAdmin/join endpoint and that the backend returns a fully
 * populated authorized admin profile with an attached JWT token bundle.
 *
 * Business flow:
 *
 * 1. Construct a realistic ICommunityPlatformPlatformadmin.IJoin payload using
 *    random but type-safe values for username, email, password, displayName,
 *    href, and referrer.
 * 2. Call api.functional.auth.platformAdmin.join with the payload.
 * 3. Assert that the response matches ICommunityPlatformPlatformadmin.IAuthorized
 *    via typia.assert.
 * 4. Verify that profile fields echo the input values and that the linked account
 *    status allows login.
 * 5. Validate the embedded IAuthorizationToken structure and key consistency
 *    constraints such as non-empty token strings and sensible expiration
 *    ordering.
 */
export async function test_api_platform_admin_join_successful_registration_and_session_creation(
  connection: api.IConnection,
) {
  // 1. Build join payload with realistic random values
  const joinBody = {
    username: RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  // 2. Call join API
  const authorized = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });

  // 3. Type-level validation of the response structure
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(authorized);

  // 4. Business-level profile validations
  TestValidator.equals(
    "platform admin username persists from join payload",
    authorized.username,
    joinBody.username,
  );
  TestValidator.equals(
    "platform admin email persists from join payload",
    authorized.email,
    joinBody.email,
  );
  TestValidator.equals(
    "platform admin displayName persists from join payload",
    authorized.displayName,
    joinBody.displayName,
  );

  // accountStatus summary sanity checks
  const accountStatus = authorized.accountStatus;
  typia.assert<ICommunityPlatformAccountStatus.ISummary>(accountStatus);

  TestValidator.predicate(
    "new platform admin account must allow login",
    accountStatus.isLoginAllowed === true,
  );

  // deletedAt should be null or undefined for a newly created active account
  TestValidator.predicate(
    "new platform admin account must not be soft-deleted",
    authorized.deletedAt === null || authorized.deletedAt === undefined,
  );

  // 5. Token validations
  const token = authorized.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token must be a non-empty string",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token must be a non-empty string",
    token.refresh.length > 0,
  );

  // Ensure expiration ordering: refreshable_until should be >= expired_at
  const expiredAtTime = new Date(token.expired_at).getTime();
  const refreshableUntilTime = new Date(token.refreshable_until).getTime();
  TestValidator.predicate(
    "refreshable_until should not be earlier than expired_at",
    refreshableUntilTime >= expiredAtTime,
  );
}
