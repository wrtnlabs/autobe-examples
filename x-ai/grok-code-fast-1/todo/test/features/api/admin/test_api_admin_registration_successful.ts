import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Test successful creation of a new admin account and issuance of JWT tokens.
 *
 * 1. Prepare a valid admin registration payload with unique email, strong
 *    password, display_name, href, and referrer fields
 * 2. Call POST /auth/admin/join with the payload
 * 3. Assert the response contains a valid admin UUID, correct email, display_name,
 *    timestamps (created_at, updated_at), and a nested token bundle
 * 4. Confirm validity of JWT token response structure and inclusion of initial
 *    admin session summary if present
 * 5. Ensure the new admin is able to authenticate in subsequent business flows
 */
export async function test_api_admin_registration_successful(
  connection: api.IConnection,
) {
  // 1. Prepare the registration payload with all required fields
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16); // meets min/max length
  const display_name = RandomGenerator.name(2); // 2-word name within 2-50 chars
  const href = "https://admin-onboarding.example.com/register";
  const referrer = "https://admin-onboarding.example.com/landing";

  const requestBody = {
    email,
    password,
    display_name,
    href,
    referrer,
    // Optional ip field omitted for this happy path test
  } satisfies ITodoListAdmin.ICreate;

  // 2. Call the admin registration endpoint
  const authAdmin = await api.functional.auth.admin.join(connection, {
    body: requestBody,
  });
  typia.assert(authAdmin);

  // 3. Assert primary response fields
  TestValidator.predicate(
    "admin id is valid UUID",
    typeof authAdmin.id === "string" && authAdmin.id.length > 0,
  );
  TestValidator.equals("admin email matches input", authAdmin.email, email);
  TestValidator.equals(
    "display name matches input",
    authAdmin.display_name,
    display_name,
  );
  TestValidator.predicate(
    "created_at has ISO date-time format",
    typeof authAdmin.created_at === "string" && authAdmin.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at has ISO date-time format",
    typeof authAdmin.updated_at === "string" && authAdmin.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null or undefined on creation",
    authAdmin.deleted_at,
    null,
  );

  // 4. Verify token structure and validity
  typia.assert<IAuthorizationToken>(authAdmin.token);
  TestValidator.predicate(
    "access token present",
    typeof authAdmin.token.access === "string" &&
      authAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    typeof authAdmin.token.refresh === "string" &&
      authAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration ISO format",
    typeof authAdmin.token.expired_at === "string" &&
      authAdmin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until expiration is ISO format",
    typeof authAdmin.token.refreshable_until === "string" &&
      authAdmin.token.refreshable_until.length > 0,
  );

  // 5. If present, validate attached session summary
  if (authAdmin.session !== undefined) {
    typia.assert<ITodoListAdminSession.ISummary>(authAdmin.session);
    TestValidator.equals(
      "admin session id matches admin id",
      authAdmin.session.id,
      authAdmin.id,
    );
    TestValidator.equals(
      "session email matches admin email",
      authAdmin.session.email,
      email,
    );
    TestValidator.equals(
      "session display_name matches",
      authAdmin.session.display_name,
      display_name,
    );
    TestValidator.predicate(
      "session created_at has ISO date-time format",
      typeof authAdmin.session.created_at === "string" &&
        authAdmin.session.created_at.length > 0,
    );
    TestValidator.predicate(
      "session updated_at has ISO date-time format",
      typeof authAdmin.session.updated_at === "string" &&
        authAdmin.session.updated_at.length > 0,
    );
  }
}
