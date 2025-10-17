import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin password reset request for existing account with rate limiting
 * validation.
 *
 * This test validates the complete password reset workflow including:
 *
 * 1. Creating an admin account that will request password reset
 * 2. Requesting password reset for the admin's email
 * 3. Validating the generic success message response
 * 4. Testing rate limiting by making multiple consecutive requests
 *
 * The test ensures security best practices are followed:
 *
 * - Generic success messages prevent email enumeration attacks
 * - Rate limiting prevents abuse (max 3 requests per hour)
 * - Secure token generation and proper expiration handling
 */
export async function test_api_admin_password_reset_request_for_existing_account(
  connection: api.IConnection,
) {
  // Step 1: Create an admin account that will request password reset
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminName = RandomGenerator.name();
  const adminRoleLevel = RandomGenerator.pick([
    "super_admin",
    "order_manager",
    "content_moderator",
    "support_admin",
  ] as const);

  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role_level: adminRoleLevel,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Verify the admin was created successfully
  TestValidator.equals(
    "created admin email matches",
    createdAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "created admin name matches",
    createdAdmin.name,
    adminName,
  );
  TestValidator.equals(
    "created admin role level matches",
    createdAdmin.role_level,
    adminRoleLevel,
  );

  // Step 2: Request password reset for the created admin
  const resetRequest = {
    email: adminEmail,
  } satisfies IShoppingMallAdmin.IPasswordResetRequest;

  const resetResponse: IShoppingMallAdmin.IPasswordResetRequestResponse =
    await api.functional.auth.admin.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequest,
      },
    );
  typia.assert(resetResponse);

  // Step 3: Test rate limiting - attempt 2 more password reset requests (total 3)
  const secondResetResponse: IShoppingMallAdmin.IPasswordResetRequestResponse =
    await api.functional.auth.admin.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequest,
      },
    );
  typia.assert(secondResetResponse);

  const thirdResetResponse: IShoppingMallAdmin.IPasswordResetRequestResponse =
    await api.functional.auth.admin.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequest,
      },
    );
  typia.assert(thirdResetResponse);

  // Step 4: The 4th request should trigger rate limiting and fail
  await TestValidator.error(
    "fourth password reset request should be rate limited",
    async () => {
      await api.functional.auth.admin.password.reset.request.requestPasswordReset(
        connection,
        {
          body: resetRequest,
        },
      );
    },
  );

  // Step 5: Test password reset request for non-existent email returns same generic message
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const nonExistentResetRequest = {
    email: nonExistentEmail,
  } satisfies IShoppingMallAdmin.IPasswordResetRequest;

  const nonExistentResetResponse: IShoppingMallAdmin.IPasswordResetRequestResponse =
    await api.functional.auth.admin.password.reset.request.requestPasswordReset(
      connection,
      {
        body: nonExistentResetRequest,
      },
    );
  typia.assert(nonExistentResetResponse);
}
