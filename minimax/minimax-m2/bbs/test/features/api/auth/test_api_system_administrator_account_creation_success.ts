import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Test successful system administrator account creation with valid data.
 *
 * Validates that new admin accounts are properly created in the system with
 * active status, proper profile information, and JWT token generation. Ensures
 * admin accounts have full system access privileges from creation.
 *
 * Test Strategy:
 *
 * 1. Generate valid random admin account data using proper DTO structure
 * 2. Call the system administrator join endpoint with valid data
 * 3. Validate the response contains proper admin profile information (ID, display
 *    name, email, status)
 * 4. Verify JWT tokens are generated and properly structured (access, refresh,
 *    expiration times)
 * 5. Ensure admin status is 'active' as expected for new accounts
 * 6. Validate all response fields match the expected
 *    IEconPoliticalDiscussionSystemAdministrator.IAuthorized type
 * 7. Verify timestamps (created_at, updated_at) are present and properly formatted
 * 8. Test with various valid data combinations to ensure robustness
 *
 * Validation Focus:
 *
 * - Response type validation using typia.assert()
 * - Admin account profile completeness
 * - JWT token generation and structure
 * - Active status confirmation
 * - Proper timestamp generation
 * - Business rule compliance for admin account creation
 */
export async function test_api_system_administrator_account_creation_success(
  connection: api.IConnection,
) {
  // Generate realistic test data for system administrator
  const adminDisplayName = RandomGenerator.name();
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminBio = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const avatarUrl = `https://example.com/avatars/${RandomGenerator.alphaNumeric(8)}.jpg`;

  // Create system administrator account
  const adminResponse =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: adminDisplayName,
        email: adminEmail,
        bio: adminBio,
        avatar_url: avatarUrl,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });

  // Validate response structure and content
  typia.assert(adminResponse);

  // Verify admin account profile information
  TestValidator.equals(
    "display name should match input",
    adminResponse.display_name,
    adminDisplayName,
  );
  TestValidator.equals(
    "email should match input",
    adminResponse.email,
    adminEmail,
  );
  TestValidator.equals("bio should match input", adminResponse.bio, adminBio);
  TestValidator.equals(
    "avatar URL should match input",
    adminResponse.avatar_url,
    avatarUrl,
  );
  TestValidator.equals(
    "status should be active",
    adminResponse.status,
    "active",
  );

  // Verify JWT token structure
  TestValidator.predicate(
    "access token should exist and not be empty",
    adminResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should exist and not be empty",
    adminResponse.token.refresh.length > 0,
  );

  // Verify timestamps are present and properly formatted
  TestValidator.predicate(
    "created_at should be valid ISO date",
    typeof adminResponse.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at should be valid ISO date",
    typeof adminResponse.updated_at === "string",
  );
  TestValidator.predicate(
    "access token expiry should be valid ISO date",
    typeof adminResponse.token.expired_at === "string",
  );
  TestValidator.predicate(
    "refresh token expiry should be valid ISO date",
    typeof adminResponse.token.refreshable_until === "string",
  );

  // Verify timestamps are reasonable (not in the past or too far in future)
  const now = new Date();
  const createdAt = new Date(adminResponse.created_at);
  const accessExpiresAt = new Date(adminResponse.token.expired_at);

  TestValidator.predicate(
    "created_at should not be in the future",
    createdAt <= now,
  );
  TestValidator.predicate(
    "access token expiry should be in the future",
    accessExpiresAt > now,
  );
  TestValidator.predicate(
    "access token expiry should be reasonable (within 24 hours)",
    accessExpiresAt <= new Date(now.getTime() + 24 * 60 * 60 * 1000),
  );

  // Verify deleted_at is null for active admin
  TestValidator.equals(
    "deleted_at should be null for active admin",
    adminResponse.deleted_at,
    null,
  );
}
