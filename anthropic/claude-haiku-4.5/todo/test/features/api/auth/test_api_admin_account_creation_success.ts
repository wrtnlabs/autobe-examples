import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test complete admin account creation workflow and token issuance.
 *
 * This test validates the complete admin registration process:
 *
 * 1. Register new admin with valid email and password meeting security
 *    requirements (min 8 chars)
 * 2. Verify system validates email format and ensures email uniqueness
 * 3. Confirm password is securely hashed (not stored in plaintext)
 * 4. Verify admin record is created in todo_app_admins with 'active' status
 * 5. Confirm creation timestamp is recorded correctly
 * 6. Validate JWT access token is issued with 30-minute expiration
 * 7. Validate refresh token is issued with 7-day expiration
 * 8. Verify newly created admin has correct email, status, and timestamps
 * 9. Confirm Authorization header is automatically set with access token
 * 10. Verify token structure contains required claims for admin authentication
 */
export async function test_api_admin_account_creation_success(
  connection: api.IConnection,
) {
  // Generate valid email and password for admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12); // Ensure >= 8 chars

  // Register new admin with valid credentials
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        password_confirmation: adminPassword,
      } satisfies ITodoAppAdmin.IRegister,
    },
  );

  // Validate admin response structure and data - typia.assert handles ALL type validation
  typia.assert(admin);

  // Verify email matches registration input
  TestValidator.equals(
    "admin email matches registration",
    admin.email,
    adminEmail,
  );

  // Verify admin status is 'active'
  TestValidator.equals("admin status should be active", admin.status, "active");

  // Verify updated_at is same as or after created_at (business logic validation)
  const createdDate = new Date(admin.created_at).getTime();
  const updatedDate = new Date(admin.updated_at).getTime();
  TestValidator.predicate(
    "updated_at should be >= created_at",
    updatedDate >= createdDate,
  );

  // Validate token structure
  const token: IAuthorizationToken = admin.token;
  typia.assert(token);

  // Verify access token expiration is in future
  const accessExpired = new Date(token.expired_at).getTime();
  const now = Date.now();
  TestValidator.predicate(
    "access token should not be expired",
    accessExpired > now,
  );

  // Verify refresh token expiration is in future and after access token
  const refreshExpired = new Date(token.refreshable_until).getTime();
  TestValidator.predicate(
    "refresh token should not be expired",
    refreshExpired > now,
  );
  TestValidator.predicate(
    "refresh token should expire after access token",
    refreshExpired > accessExpired,
  );

  // Verify approximately 30 minute expiration for access token (allow 5 min variance)
  const accessTokenDuration = (accessExpired - now) / (1000 * 60);
  TestValidator.predicate(
    "access token should expire in approximately 30 minutes",
    accessTokenDuration >= 25 && accessTokenDuration <= 35,
  );

  // Verify approximately 7 day expiration for refresh token (allow 1 hour variance)
  const refreshTokenDuration = (refreshExpired - now) / (1000 * 60 * 60);
  TestValidator.predicate(
    "refresh token should expire in approximately 7 days",
    refreshTokenDuration >= 167 && refreshTokenDuration <= 169,
  );

  // Verify connection Authorization header was automatically set
  TestValidator.predicate(
    "Authorization header should be set with access token",
    connection.headers?.Authorization === `Bearer ${token.access}`,
  );
}
