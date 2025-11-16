import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Validates successful administrator authentication and session issuance.
 *
 * This test verifies that an active, non-blocked, and not deleted administrator
 * can successfully log in via the /auth/admin/login endpoint with valid
 * credentials and session context (IP, href, referrer). It checks that the
 * response contains a valid administrator identity (including id, email,
 * is_email_verified, is_active, is_blocked, created_at, updated_at, deleted_at)
 * as well as a JWT token bundle with valid access, refresh tokens and their
 * expirations. The test also ensures that all fields match required formats and
 * confirms the administrator is permitted to log in (is_active=true,
 * is_blocked=false, deleted_at=null).
 *
 * Steps:
 *
 * 1. Arrange: Generate random but valid IDiscussionBoardAdmin.ILogin data (email,
 *    password, href, referrer, with optional null/undefined IP).
 * 2. (Pre-requisite: before running this test, ensure that an admin account exists
 *    in the system with the generated email/password, is_active=true,
 *    is_blocked=false, deleted_at=null.)
 * 3. Act: Call api.functional.auth.admin.login with the generated ILogin input.
 * 4. Assert: Validate that the authorization response matches
 *    IDiscussionBoardAdmin.IAuthorized and fields are present and well-formed,
 *    especially token.access, token.refresh, token.expired_at,
 *    token.refreshable_until, and identity fields. Confirm all returned fields
 *    are expected and in correct format.
 *
 * Note: This test does NOT attempt to test negative scenarios (blocked,
 * inactive, wrong pw, or deleted accounts). It checks only the positive
 * authentication path.
 */
export async function test_api_admin_login_successful_authentication(
  connection: api.IConnection,
) {
  // 1. Generate administrator login credentials (assuming admin exists in DB with these values for a test env):
  const loginInput = typia.random<IDiscussionBoardAdmin.ILogin>();

  // 2. Call /auth/admin/login endpoint
  const response = await api.functional.auth.admin.login(connection, {
    body: loginInput,
  });

  // 3. Validate response structure and token/identity fields
  typia.assert(response);

  // Check identity fields present and of correct types
  TestValidator.predicate(
    "admin id is uuid",
    typeof response.id === "string" && response.id.length > 0,
  );
  TestValidator.predicate(
    "admin email is present",
    typeof response.email === "string" && response.email.length > 0,
  );
  TestValidator.predicate(
    "admin created_at has correct format",
    typeof response.created_at === "string" && response.created_at.length >= 10,
  );
  TestValidator.predicate("admin is active", response.is_active === true);
  TestValidator.predicate(
    "admin is not blocked",
    response.is_blocked === false,
  );
  TestValidator.equals("admin not deleted", response.deleted_at, null);

  // Check token bundle
  TestValidator.predicate(
    "token access is present",
    typeof response.token.access === "string" &&
      response.token.access.length > 20,
  );
  TestValidator.predicate(
    "token refresh is present",
    typeof response.token.refresh === "string" &&
      response.token.refresh.length > 20,
  );
  TestValidator.predicate(
    "token expired_at format",
    typeof response.token.expired_at === "string" &&
      response.token.expired_at.length > 10,
  );
  TestValidator.predicate(
    "token refreshable_until format",
    typeof response.token.refreshable_until === "string" &&
      response.token.refreshable_until.length > 10,
  );
}
