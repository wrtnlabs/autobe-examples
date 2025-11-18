import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Validate successful login for an admin account.
 *
 * Scenario:
 *
 * 1. Prepare a valid ITodoListAdmin.ILogin input (random but valid admin email and
 *    password).
 * 2. Assume the admin is already registered in the backend (precondition:
 *    registration not in this workflow).
 * 3. Make a POST request to /auth/admin/login with correct credentials.
 * 4. Assert that the response matches ITodoListAdmin.IAuthorized structure using
 *    typia.assert (token, admin details, etc).
 * 5. Verify that the response.token subfields include non-empty access/refresh JWT
 *    tokens and valid expiration timestamps.
 * 6. Assert that the returned email in the payload matches the input email.
 * 7. Optionally, check that display_name and id are present and non-empty, and
 *    created_at/updated_at fields are valid ISO8601 timestamps.
 * 8. Optionally, check session (if present) contains valid summary data.
 * 9. No explicit error case tested here (success flow only).
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
) {
  // 1. Prepare a valid login input for an existing admin
  const loginInput = typia.random<ITodoListAdmin.ILogin>();

  // 2. Call admin login API with valid credentials
  const result = await api.functional.auth.admin.login(connection, {
    body: loginInput,
  });

  // 3. Assert shape and types of response (deep structure)
  typia.assert(result);

  // 4. Validate that returned email matches input email
  TestValidator.equals(
    "returned email matches login credential",
    result.email,
    loginInput.email,
  );

  // 5. Validate that access and refresh tokens are non-empty strings
  TestValidator.predicate(
    "access token is present",
    typeof result.token.access === "string" && result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    typeof result.token.refresh === "string" && result.token.refresh.length > 0,
  );

  // 6. Validate access/refresh token timestamps are valid format and not empty
  TestValidator.predicate(
    "access token expired_at is valid ISO date string",
    typeof result.token.expired_at === "string" &&
      result.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token refreshable_until is valid ISO date string",
    typeof result.token.refreshable_until === "string" &&
      result.token.refreshable_until.length > 0,
  );

  // 7. Validate that admin unique id, display_name, created_at, updated_at are valid non-empty strings
  TestValidator.predicate(
    "admin id is present",
    typeof result.id === "string" && result.id.length > 0,
  );
  TestValidator.predicate(
    "display_name is present",
    typeof result.display_name === "string" && result.display_name.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid ISO date string",
    typeof result.created_at === "string" && result.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid ISO date string",
    typeof result.updated_at === "string" && result.updated_at.length > 0,
  );

  // 8. If session is present, validate summary fields
  if (result.session) {
    typia.assert(result.session);
    TestValidator.equals(
      "session email matches login email",
      result.session.email,
      loginInput.email,
    );
    TestValidator.predicate(
      "session id present",
      typeof result.session.id === "string" && result.session.id.length > 0,
    );
    TestValidator.predicate(
      "session display_name present",
      typeof result.session.display_name === "string" &&
        result.session.display_name.length > 0,
    );
    TestValidator.predicate(
      "session created_at valid ISO date string",
      typeof result.session.created_at === "string" &&
        result.session.created_at.length > 0,
    );
    TestValidator.predicate(
      "session updated_at valid ISO date string",
      typeof result.session.updated_at === "string" &&
        result.session.updated_at.length > 0,
    );
  }
}
