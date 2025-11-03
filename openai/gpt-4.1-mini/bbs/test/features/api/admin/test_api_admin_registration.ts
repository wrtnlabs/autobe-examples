import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";

/**
 * Tests the registration workflow for a new administrator account.
 *
 * This test ensures that a new admin can be registered successfully by sending
 * a unique email and a secure password to the /auth/admin/join endpoint. Upon
 * success, the test verifies that the returned admin data includes valid
 * identification, authentication tokens, and timestamps.
 *
 * The test performs the following steps:
 *
 * 1. Create random but valid registration data with a unique email and password.
 * 2. Call the POST /auth/admin/join endpoint using the registered API method.
 * 3. Assert the structure and content of the response to verify correctness.
 * 4. Confirm that JWT tokens are present and correctly formatted.
 */
export async function test_api_admin_registration(connection: api.IConnection) {
  // Step 1: Prepare valid registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // Secure random password
  const requestBody = { email, password } satisfies IDiscussionBoardAdmin.IJoin;

  // Step 2: Register new admin
  const response: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: requestBody });
  typia.assert(response);

  // Step 3: Validate response properties
  TestValidator.predicate(
    "id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );
  TestValidator.equals("email matches request", response.email, email);
  TestValidator.predicate(
    "password_hash is non-empty string",
    typeof response.password_hash === "string" &&
      response.password_hash.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    !isNaN(Date.parse(response.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    !isNaN(Date.parse(response.updated_at)),
  );
  // deleted_at can be null or undefined
  if (response.deleted_at !== null && response.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is valid ISO date-time",
      !isNaN(Date.parse(response.deleted_at)),
    );
  }

  // Step 4: Validate token object
  const token: IAuthorizationToken = response.token;
  TestValidator.predicate(
    "token.access is a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is valid ISO date-time",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid ISO date-time",
    !isNaN(Date.parse(token.refreshable_until)),
  );
}
