import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";

/**
 * Test admin user registration creating a new admin account with valid
 * credentials.
 *
 * This test verifies that a new admin account is created successfully by
 * calling the `/auth/admin/join` endpoint with a valid email and password. It
 * ensures that the response contains the expected admin user data and JWT token
 * details.
 *
 * Steps:
 *
 * 1. Generate a random valid email and a simple password string.
 * 2. Call the `api.functional.auth.admin.join` function with the provided
 *    credentials.
 * 3. Assert that the response matches the `IRedditCommunityAdmin.IAuthorized`
 *    type.
 * 4. Validate the presence and format of JWT token details.
 * 5. Validate UUID format for the returned admin ID.
 * 6. Confirm timestamps exist and are in date-time format.
 *
 * This confirms the successful creation and authentication setup for an admin
 * user.
 */
export async function test_api_admin_user_registration(
  connection: api.IConnection,
) {
  // Generate unique random email
  const email = typia.random<string & tags.Format<"email">>();

  // Password for test admin registration
  const password = "StrongPassword123!";

  // Prepare request body
  const requestBody = {
    email,
    password,
  } satisfies IRedditCommunityAdmin.ICreate;

  // Call admin join API
  const response: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: requestBody });

  // Runtime type validation
  typia.assert(response);

  // Validate critical fields
  TestValidator.predicate(
    "valid admin UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );

  TestValidator.equals("email matches input", response.email, email);

  TestValidator.predicate(
    "token access non-empty",
    response.token.access.length > 0,
  );

  TestValidator.predicate(
    "token refresh non-empty",
    response.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "created_at date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(response.created_at),
  );

  TestValidator.predicate(
    "updated_at date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(response.updated_at),
  );

  TestValidator.predicate(
    "admin_level is non-negative integer",
    typeof response.admin_level === "number" && response.admin_level >= 0,
  );

  TestValidator.predicate(
    "deleted_at is null or date-time format",
    response.deleted_at === null ||
      (typeof response.deleted_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(response.deleted_at)),
  );

  TestValidator.predicate(
    "token expired_at date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(response.token.expired_at),
  );

  TestValidator.predicate(
    "token refreshable_until date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(
      response.token.refreshable_until,
    ),
  );
}
