import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";

/**
 * Validate successful admin user registration and initial token issuance.
 *
 * This E2E test exercises the public POST /auth/adminUser/join endpoint, which
 * creates a new administrator record in `discussion_board_adminusers` and
 * immediately issues JWT tokens for the `adminUser` actor.
 *
 * Business flow covered by this test:
 *
 * 1. Build a well-formed IDiscussionBoardAdminUserJoin.IRequest payload
 *
 *    - Unique, valid email
 *    - Strong password string
 *    - Human-readable display_name
 *    - Optional bio and IP
 *    - Realistic href and referrer URIs
 * 2. Call api.functional.auth.adminUser.join with the request body.
 * 3. Validate that the response conforms to IDiscussionBoardAdminuser.IAuthorized
 *    using typia.assert, including nested IAuthorizationToken.
 * 4. Verify business semantics:
 *
 *    - Returned email matches the requested email.
 *    - Returned displayName reflects the requested display_name.
 *    - Id, loginId, status, and role are non-empty strings.
 *    - CreatedAt is a valid past-or-current timestamp.
 *    - UpdatedAt is not earlier than createdAt.
 * 5. Verify token properties:
 *
 *    - Access and refresh are non-empty strings.
 *    - Expired_at and refreshable_until are valid date-time strings.
 *    - Expired_at is in the future.
 *    - Refreshable_until is not earlier than expired_at.
 *
 * The SDK automatically stores the access token into connection.headers
 * (Authorization) after a successful join, but this test focuses on the
 * correctness of the join response itself rather than calling additional
 * admin-only endpoints.
 */
export async function test_api_admin_user_join_success(
  connection: api.IConnection,
) {
  // 1. Prepare unique admin registration request body
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const requestBody = {
    email,
    password,
    display_name: displayName,
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href,
    referrer,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  // 2. Call the admin join API
  const authorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: requestBody,
    });

  // 3. Full structural/type validation of the authorized payload
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(authorized);

  // 4. Basic identity and profile checks
  TestValidator.equals(
    "admin email should match request email",
    authorized.email,
    email,
  );

  TestValidator.equals(
    "admin displayName should reflect request display_name",
    authorized.displayName,
    displayName,
  );

  TestValidator.predicate(
    "admin id should be a non-empty string",
    authorized.id.length > 0,
  );

  TestValidator.predicate(
    "admin loginId should be a non-empty string",
    authorized.loginId.length > 0,
  );

  TestValidator.predicate(
    "admin status should be a non-empty string",
    authorized.status.length > 0,
  );

  TestValidator.predicate(
    "admin role should be a non-empty string",
    authorized.role.length > 0,
  );

  // Timestamp validations for admin profile
  const createdAtDate = new Date(authorized.createdAt);
  const updatedAtDate = new Date(authorized.updatedAt);
  const now = Date.now();

  TestValidator.predicate(
    "createdAt should be a valid past or current timestamp",
    !Number.isNaN(createdAtDate.getTime()) && createdAtDate.getTime() <= now,
  );

  TestValidator.predicate(
    "updatedAt should be a valid timestamp not before createdAt",
    !Number.isNaN(updatedAtDate.getTime()) &&
      updatedAtDate.getTime() >= createdAtDate.getTime(),
  );

  // 5. Token structure and business validations
  const token: IAuthorizationToken = authorized.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token should be a non-empty string",
    token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be a non-empty string",
    token.refresh.length > 0,
  );

  const expiredAtDate = new Date(token.expired_at);
  const refreshableUntilDate = new Date(token.refreshable_until);

  TestValidator.predicate(
    "expired_at should be a valid future timestamp",
    !Number.isNaN(expiredAtDate.getTime()) && expiredAtDate.getTime() > now,
  );

  TestValidator.predicate(
    "refreshable_until should be a valid future timestamp not earlier than expired_at",
    !Number.isNaN(refreshableUntilDate.getTime()) &&
      refreshableUntilDate.getTime() >= expiredAtDate.getTime(),
  );
}
