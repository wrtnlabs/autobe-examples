import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate the refresh functionality of the admin authentication token.
 *
 * Admin users need to refresh their JWT tokens to maintain active sessions
 * without repeated login. This test verifies that a token refresh request
 * correctly returns a new authorization token set with valid properties.
 *
 * The test performs the following steps:
 *
 * 1. Calls the admin token refresh API endpoint.
 * 2. Validates the response type matches IShoppingMallAdmin.IAuthorized.
 * 3. Validates the authorization token contains the access and refresh token, as
 *    well as their expiration timestamps.
 * 4. Confirms the access token and refresh token are non-empty strings.
 * 5. Confirms the timestamp fields are valid ISO 8601 date strings.
 * 6. Ensures the overall response object's properties match expected patterns.
 */
export async function test_api_auth_admin_refresh_token(
  connection: api.IConnection,
) {
  // Call the admin refresh endpoint to get new tokens
  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection);
  typia.assert(authorized);

  // Validate top-level admin properties
  TestValidator.predicate(
    "admin id is non-empty UUID",
    authorized.id.length === 36 && /^[0-9a-fA-F\-]{36}$/.test(authorized.id),
  );
  TestValidator.predicate(
    "admin email is non-empty string",
    typeof authorized.email === "string" && authorized.email.length > 0,
  );
  TestValidator.predicate(
    "admin name is non-empty string",
    typeof authorized.name === "string" && authorized.name.length > 0,
  );
  TestValidator.predicate(
    "admin role is non-empty string",
    typeof authorized.role === "string" && authorized.role.length > 0,
  );
  TestValidator.predicate(
    "admin is_active is boolean",
    typeof authorized.is_active === "boolean",
  );
  // created_at and updated_at must be ISO 8601 format strings
  TestValidator.predicate(
    "created_at is ISO 8601 string",
    typeof authorized.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        authorized.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 string",
    typeof authorized.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        authorized.updated_at,
      ),
  );

  // Validate token object
  const token: IAuthorizationToken = authorized.token;
  TestValidator.predicate(
    "access token is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is ISO 8601 string",
    typeof token.expired_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601 string",
    typeof token.refreshable_until === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        token.refreshable_until,
      ),
  );

  // Additional consistency checks
  TestValidator.predicate(
    "expired_at is before refreshable_until",
    token.expired_at < token.refreshable_until,
  );
}
