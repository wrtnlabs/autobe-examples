import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Validate successful adminUser registration and authorized JWT issuance.
 *
 * Business goal:
 *
 * - Ensure that POST /auth/adminUser/join correctly creates a new adminUser
 *   account using the join DTO and immediately returns an authorized context
 *   suitable for authenticated admin operations.
 *
 * Steps:
 *
 * 1. Build a realistic ICommunityPlatformAdminUserJoin.IRequest body with:
 *
 *    - Username: random human-readable handle
 *    - Email: random, valid email address
 *    - Password: random strong password string (treated as Format<"password">)
 * 2. Call api.functional.auth.adminUser.join(connection, { body }).
 * 3. Use typia.assert to validate that the response matches
 *    ICommunityPlatformAdminuser.IAuthorized exactly (including nested
 *    IAuthorizationToken structure).
 * 4. Perform business-level assertions with TestValidator:
 *
 *    - Id is a non-empty string (UUID format already enforced by typia).
 *    - Username and email in the response match the requested values.
 *    - Is_super_admin is false for a newly joined admin by default.
 *    - Token.access and token.refresh are non-empty strings.
 *    - Token.expired_at and token.refreshable_until represent timestamps that are
 *         strictly later than the current time, ensuring future validity at
 *         issuance.
 *
 * This test deliberately focuses only on the happy-path behavior and does not
 * attempt to validate failure cases such as duplicate usernames/emails or
 * invalid password formats, since those belong to separate negative tests.
 */
export async function test_api_adminuser_join_success(
  connection: api.IConnection,
) {
  // 1. Prepare join request payload with realistic random data
  const username: string = RandomGenerator.name(1);
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // For password, treat as an opaque string; Format<"password"> is enforced
  // by the backend and typia, so we only need a reasonably complex string.
  const password: string = RandomGenerator.alphaNumeric(12) + "!Aa1";

  const body = {
    username,
    email,
    password,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  // 2. Call the join endpoint
  const authorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body,
    });

  // 3. Structural type validation
  typia.assert(authorized);

  // 4. Business-level assertions
  // 4-1. id should be non-empty (UUID format already validated by typia)
  TestValidator.predicate(
    "adminUser id should be non-empty",
    authorized.id.length > 0,
  );

  // 4-2. username and email should echo the request
  TestValidator.equals(
    "adminUser username should match requested username",
    authorized.username,
    username,
  );
  TestValidator.equals(
    "adminUser email should match requested email",
    authorized.email,
    email,
  );

  // 4-3. Newly joined admin should not be super admin by default
  TestValidator.equals(
    "newly joined adminUser should not be super admin by default",
    authorized.is_super_admin,
    false,
  );

  // 4-4. Token fields should be non-empty strings
  TestValidator.predicate(
    "access token should be non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    authorized.token.refresh.length > 0,
  );

  // 4-5. Expiration timestamps should be in the future
  const now: number = Date.now();
  const expiredAtMs: number = new Date(authorized.token.expired_at).getTime();
  const refreshableUntilMs: number = new Date(
    authorized.token.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "access token expiration should be in the future",
    expiredAtMs > now,
  );
  TestValidator.predicate(
    "refresh token expiration should be in the future",
    refreshableUntilMs > now,
  );
}
