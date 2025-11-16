import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates JWT token validity from administrator registration.
 *
 * Tests that the JWT tokens returned from successful administrator registration
 * are properly formatted, contain correct claims, and have appropriate
 * expiration times. This ensures that new administrators can immediately begin
 * platform management operations with valid authentication credentials.
 *
 * This test verifies:
 *
 * 1. Access token is a valid JWT string that can be parsed
 * 2. Refresh token is a valid JWT string that can be parsed
 * 3. Both tokens are properly formatted (three parts separated by dots)
 * 4. Expired_at timestamp is in valid ISO 8601 format and is in the future
 * 5. Refreshable_until timestamp is in valid ISO 8601 format and is in the future
 * 6. Access token expiration is sooner than refresh token expiration
 * 7. Timestamps represent reasonable token lifespans
 */
export async function test_api_administrator_registration_jwt_token_validity(
  connection: api.IConnection,
) {
  // Create a new administrator account with valid credentials
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: "https://platform.example.com/admin/register",
    referrer: "https://platform.example.com/",
    ip: "192.168.1.1",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const authorized = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });

  typia.assert(authorized);

  // Validate that the token structure is present
  typia.assert(authorized.token);

  const token: ICommunityPlatformMember = authorized.token;

  // Verify access token is a valid JWT string (should have 3 parts separated by dots)
  TestValidator.predicate(
    "access token should be a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );

  const accessParts = token.access.split(".");
  TestValidator.equals(
    "access token should have three parts separated by dots (JWT format)",
    accessParts.length,
    3,
  );

  // Verify refresh token is a valid JWT string (should have 3 parts separated by dots)
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  const refreshParts = token.refresh.split(".");
  TestValidator.equals(
    "refresh token should have three parts separated by dots (JWT format)",
    refreshParts.length,
    3,
  );

  // Verify expired_at is a valid ISO 8601 date-time string
  typia.assert<string & tags.Format<"date-time">>(token.expired_at);
  const expiredAtDate = new Date(token.expired_at);
  TestValidator.predicate(
    "expired_at should be a valid date",
    !isNaN(expiredAtDate.getTime()),
  );

  // Verify refreshable_until is a valid ISO 8601 date-time string
  typia.assert<string & tags.Format<"date-time">>(token.refreshable_until);
  const refreshableUntilDate = new Date(token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until should be a valid date",
    !isNaN(refreshableUntilDate.getTime()),
  );

  // Verify that expired_at represents a future time
  const now = new Date();
  TestValidator.predicate(
    "expired_at should be in the future",
    expiredAtDate > now,
  );

  // Verify that refreshable_until represents a future time
  TestValidator.predicate(
    "refreshable_until should be in the future",
    refreshableUntilDate > now,
  );

  // Verify that access token expires before refresh token
  TestValidator.predicate(
    "access token should expire before refresh token",
    expiredAtDate < refreshableUntilDate,
  );

  // Verify reasonable token lifespans (access token typically 1 hour, refresh token typically 7 days)
  const accessTokenLifespan = expiredAtDate.getTime() - now.getTime();
  const refreshTokenLifespan = refreshableUntilDate.getTime() - now.getTime();

  // Access token lifespan should be at least 10 minutes
  TestValidator.predicate(
    "access token should have a reasonable lifespan (at least 10 minutes)",
    accessTokenLifespan >= 10 * 60 * 1000,
  );

  // Refresh token lifespan should be longer than access token
  TestValidator.predicate(
    "refresh token lifespan should be significantly longer than access token",
    refreshTokenLifespan > accessTokenLifespan * 2,
  );

  // Verify the administrator account details in the response
  TestValidator.equals(
    "administrator email should match the registration email",
    authorized.email,
    adminData.email,
  );

  TestValidator.equals(
    "administrator username should match the registration username",
    authorized.username,
    adminData.username,
  );

  TestValidator.predicate(
    "administrator account status should be active after registration",
    authorized.account_status === "active",
  );

  TestValidator.predicate(
    "administrator should have a valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
}
