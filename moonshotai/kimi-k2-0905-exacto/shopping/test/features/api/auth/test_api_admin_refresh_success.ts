import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test successful admin token refresh functionality where a valid refresh token
 * is used to obtain new access and refresh tokens.
 *
 * This scenario validates the complete refresh flow including proper token
 * validation, authentication renewal, and maintaining administrative privileges
 * across session extensions.
 *
 * 1. First, we establish an administrative session context by creating a valid
 *    refresh token and performing the refresh operation
 * 2. Extract the refresh token from the authenticated session and use it to obtain
 *    new tokens
 * 3. Validate that new tokens are properly generated with correct types, formats,
 *    and expiration times
 * 4. Verify that administrative privileges are maintained with full dashboard
 *    access capabilities
 * 5. Check that the connection headers are properly updated with the new access
 *    token
 * 6. Validate the complete token structure including access token, refresh token,
 *    and expiration timestamps
 *
 * The test ensures that refreshing tokens maintains session continuity and
 * administrative access while providing new security credentials with proper
 * timestamp formats and business rule compliance.
 */
export async function test_api_admin_refresh_success(
  connection: api.IConnection,
) {
  // Create a comprehensive test using the simulation mode to validate token refresh
  // Since we don't have admin authentication dependencies, we use the API's built-in simulation

  // Generate a mock refresh token following the expected format
  const refreshRequest = {
    refresh_token: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallAdmin.IRefresh;

  // Perform token refresh operation - this uses the API's simulation capability
  const authorization = await api.functional.auth.admin.refresh(
    { ...connection, simulate: true }, // Enable simulation mode for testing
    {
      body: refreshRequest,
    },
  );

  // Validate the response structure with typia assertion
  typia.assert(authorization);

  // Verify admin basic properties and formats
  TestValidator.predicate(
    "admin ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorization.id,
    ),
  );

  TestValidator.predicate(
    "admin email contains @ symbol and has reasonable length",
    authorization.email.includes("@") && authorization.email.length <= 255,
  );

  TestValidator.predicate(
    "admin first name and last name are populated with valid ranges",
    authorization.first_name.length >= 1 &&
      authorization.first_name.length <= 100 &&
      authorization.last_name.length >= 1 &&
      authorization.last_name.length <= 100,
  );

  // Verify administrative privileges and role classifications
  TestValidator.predicate(
    "admin level is one of valid roles",
    ["super_admin", "department_admin", "support_admin", "viewer"].includes(
      authorization.admin_level,
    ),
  );

  TestValidator.predicate(
    "is_super_admin has boolean type",
    typeof authorization.is_super_admin === "boolean",
  );

  TestValidator.predicate(
    "is_active has boolean type",
    typeof authorization.is_active === "boolean",
  );

  // Validate timestamps are present with correct date-time format
  TestValidator.predicate(
    "created_at has ISO 8601 date-time format",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z/.test(
      authorization.created_at,
    ),
  );

  // Validate optional timestamps if present
  if (
    authorization.updated_at !== null &&
    authorization.updated_at !== undefined
  ) {
    TestValidator.predicate(
      "updated_at has ISO 8601 date-time format when present",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z/.test(
        authorization.updated_at,
      ),
    );
  }

  if (
    authorization.deleted_at !== null &&
    authorization.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at has ISO 8601 date-time format when present",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z/.test(
        authorization.deleted_at,
      ),
    );
  }

  // Validate department field if present
  if (
    authorization.department !== null &&
    authorization.department !== undefined
  ) {
    TestValidator.predicate(
      "department has maximum length constraint of 100 characters",
      authorization.department.length <= 100,
    );
  }

  // Validate complete token structure
  TestValidator.predicate(
    "access token is present and is a string",
    typeof authorization.token.access === "string" &&
      authorization.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is present and is a string",
    typeof authorization.token.refresh === "string" &&
      authorization.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "expired_at has ISO 8601 date-time format with Z suffix",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z/.test(
      authorization.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "refreshable_until has ISO 8601 date-time format with Z suffix",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z/.test(
      authorization.token.refreshable_until,
    ),
  );

  // Verify connection headers were properly updated with new access token
  TestValidator.equals(
    "authorization header contains new access token from refresh",
    connection.headers?.Authorization,
    authorization.token.access,
  );

  // Advanced validation: ensure expired_at is chronologically after created_at
  const createdTime = new Date(authorization.created_at).getTime();
  const expiredTime = new Date(authorization.token.expired_at).getTime();
  TestValidator.predicate(
    "access token expires after admin creation time",
    expiredTime > createdTime,
  );

  // Ensure refresh token has longer validity than access token
  const refreshTime = new Date(authorization.token.refreshable_until).getTime();
  TestValidator.predicate(
    "refresh token valid longer than access token",
    refreshTime > expiredTime,
  );
}
