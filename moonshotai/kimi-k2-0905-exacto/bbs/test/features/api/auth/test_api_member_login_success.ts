import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";

/**
 * Test successful member login with valid username and password credentials.
 *
 * This test validates the complete member authentication flow by:
 *
 * 1. Creating a new member account through the registration endpoint
 * 2. Authenticating the member with valid login credentials
 * 3. Verifying that JWT access and refresh tokens are properly issued
 * 4. Confirming that the authenticated member data matches the expected structure
 *
 * The test ensures the system correctly validates credentials against stored
 * password hash, verifies account existence and active status (not
 * soft-deleted), and provides proper JWT tokens for accessing member-only
 * features like article creation, commenting, and file uploads on the politics
 * discussion board.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
) {
  // Generate random test data for member registration
  const joinData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies IPoliticsBbsMember.IJoin;

  // Step 1: Create member account for login testing
  const registeredMember: IPoliticsBbsMember.IAuthorized =
    await api.functional.auth.members.join(connection, { body: joinData });
  typia.assert(registeredMember);

  // Verify registration was successful
  TestValidator.equals(
    "registered member username",
    registeredMember.username,
    joinData.username,
  );
  TestValidator.equals(
    "registered member email",
    registeredMember.email,
    joinData.email,
  );
  TestValidator.predicate(
    "member has member role",
    registeredMember.role === "member" || registeredMember.role === undefined,
  );
  TestValidator.predicate(
    "member has valid ID format",
    typia.is<string & tags.Format<"uuid">>(registeredMember.id),
  );
  TestValidator.predicate(
    "member has password hash",
    registeredMember.password_hash.length > 0,
  );
  TestValidator.predicate(
    "member has valid timestamps",
    typia.is<string & tags.Format<"date-time">>(registeredMember.created_at) &&
      typia.is<string & tags.Format<"date-time">>(registeredMember.updated_at),
  );
  TestValidator.predicate(
    "member is not deleted",
    registeredMember.deleted_at === null ||
      registeredMember.deleted_at === undefined,
  );

  // Step 2: Test successful login with valid credentials
  const loginData = {
    username: joinData.username,
    password: joinData.password,
    href: "https://example.com/login",
    referrer: "https://example.com/join",
  } satisfies IPoliticsBbsMember.ILogin;

  const authenticatedMember: IPoliticsBbsMember.IAuthorized =
    await api.functional.auth.members.login(connection, { body: loginData });
  typia.assert(authenticatedMember);

  // Step 3: Verify login response matches expected structure and data
  TestValidator.equals(
    "authenticated member ID matches",
    authenticatedMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "authenticated member username matches",
    authenticatedMember.username,
    registeredMember.username,
  );
  TestValidator.equals(
    "authenticated member email matches",
    authenticatedMember.email,
    registeredMember.email,
  );
  TestValidator.equals(
    "authenticated member password hash matches",
    authenticatedMember.password_hash,
    registeredMember.password_hash,
  );
  TestValidator.equals(
    "authenticated member timestamps match",
    authenticatedMember.created_at,
    registeredMember.created_at,
  );
  TestValidator.equals(
    "authenticated member role matches",
    authenticatedMember.role,
    registeredMember.role,
  );
  TestValidator.equals(
    "authenticated member deletion status matches",
    authenticatedMember.deleted_at,
    registeredMember.deleted_at,
  );

  // Step 4: Verify JWT tokens are properly issued
  TestValidator.predicate(
    "member has authorization token",
    authenticatedMember.token !== null &&
      authenticatedMember.token !== undefined,
  );
  TestValidator.predicate(
    "token has access token",
    authenticatedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has refresh token",
    authenticatedMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration timestamp",
    typia.is<string & tags.Format<"date-time">>(
      authenticatedMember.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token has refreshable timestamp",
    typia.is<string & tags.Format<"date-time">>(
      authenticatedMember.token.refreshable_until,
    ),
  );

  // Step 5: Verify token expiration logic
  const expiredAt = new Date(authenticatedMember.token.expired_at);
  const refreshableUntil = new Date(
    authenticatedMember.token.refreshable_until,
  );
  const now = new Date();

  TestValidator.predicate("access token expires in future", expiredAt > now);
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntil > expiredAt,
  );
}
