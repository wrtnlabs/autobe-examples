import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";

/**
 * This E2E test validates the admin user registration followed by successful
 * login.
 *
 * It ensures a new admin user can be created with a valid email and strong
 * password, and that login correctly authenticates this user, issues valid JWT
 * tokens, and returns consistent user data and tokens as per the
 * reddit_community_admins API specifications.
 *
 * The test accomplishes this by:
 *
 * 1. Registering a new admin account through /auth/admin/join.
 * 2. Logging in with those same credentials at /auth/admin/login.
 * 3. Validating response structures, tokens, and user identification fields
 *    thoroughly.
 *
 * This test verifies role-based access control setup and authentication
 * workflow correctness, including JWT issuance and format.
 */
export async function test_api_admin_login_successful_after_registration(
  connection: api.IConnection,
) {
  // Step 1: Register admin user for setting up authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12); // 12 char strong password
  // Prepare join request body
  const joinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditCommunityAdmin.ICreate;

  // Perform registration
  const joinedAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  // Step 2: Login with the same credentials
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditCommunityAdmin.ILogin;

  const loggedInAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // Validate returned token and properties are consistent with registration
  TestValidator.equals(
    "admin id is consistent",
    loggedInAdmin.id,
    joinedAdmin.id,
  );
  TestValidator.equals(
    "admin email is consistent",
    loggedInAdmin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "token access is a non-empty string",
    loggedInAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is a non-empty string",
    loggedInAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is ISO 8601 date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      loggedInAdmin.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token refreshable_until is ISO 8601 date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      loggedInAdmin.token.refreshable_until,
    ),
  );
}
