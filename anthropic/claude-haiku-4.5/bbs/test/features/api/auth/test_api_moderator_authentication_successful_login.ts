import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_authentication_successful_login(
  connection: api.IConnection,
) {
  /**
   * Test successful moderator authentication with valid credentials and session
   * context.
   *
   * This test validates that a moderator can successfully authenticate using
   * their registered email address and correct password. The API validates
   * email verification status, account status (active), password match, and
   * returns JWT tokens upon success.
   *
   * Steps:
   *
   * 1. Prepare valid login credentials with session context (href and referrer
   *    URLs)
   * 2. Call login API with email, password, and session context
   * 3. Verify response includes moderator id, email, and username
   * 4. Verify account status is 'active' and email is verified
   * 5. Verify moderation tier is 'full'
   * 6. Verify JWT tokens are present and have proper expiration times
   * 7. Validate all response data matches expected types and formats
   */

  // Prepare test credentials that meet complexity requirements:
  // Password must have: uppercase, lowercase, number, special character, minimum 8 chars
  const password = "TestPass123!";
  const email = typia.random<string & tags.Format<"email">>();

  // Generate session context URLs
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Optional IP address
  const ip = typia.random<string & tags.Format<"ipv4">>();

  // Call moderator login API with credentials and session context
  const loginBody = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies IDiscussionBoardModerator.ILogin;

  const authorized = await api.functional.auth.moderator.login(connection, {
    body: loginBody,
  });

  // Validate response structure and types
  typia.assert(authorized);

  // Verify moderator identification information
  TestValidator.predicate(
    "moderator has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.equals(
    "moderator email matches login email",
    authorized.email,
    email,
  );
  TestValidator.predicate(
    "username is 3-50 character string",
    typeof authorized.username === "string" &&
      authorized.username.length >= 3 &&
      authorized.username.length <= 50,
  );

  // Verify account status and verification
  TestValidator.equals("email is verified", authorized.email_verified, true);
  TestValidator.equals(
    "account status is active",
    authorized.account_status,
    "active",
  );
  TestValidator.equals(
    "moderation tier is full",
    authorized.moderation_tier,
    "full",
  );

  // Verify timestamps exist and are valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.updated_at),
  );

  // Verify optional timestamps when present
  if (authorized.deleted_at !== null && authorized.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is valid ISO 8601 datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.deleted_at),
    );
  }

  if (
    authorized.last_login_at !== null &&
    authorized.last_login_at !== undefined
  ) {
    TestValidator.predicate(
      "last_login_at is valid ISO 8601 datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.last_login_at),
    );
  }

  // Verify JWT token structure and content
  TestValidator.predicate(
    "access token is non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      authorized.token.refreshable_until,
    ),
  );

  // Verify token expiration logic - refresh token should have longer validity
  const accessExpiry = new Date(authorized.token.expired_at);
  const refreshExpiry = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "refresh token expiry is after access token expiry",
    refreshExpiry.getTime() > accessExpiry.getTime(),
  );
}
