import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

/**
 * Test administrator registration with valid credentials.
 *
 * Validates the complete admin registration workflow by submitting valid
 * registration data (unique username, valid email, strong password) and
 * verifying the system creates the account successfully, returns proper
 * authentication tokens, and includes complete admin profile information.
 *
 * Steps:
 *
 * 1. Generate valid registration credentials meeting all requirements
 * 2. Call admin registration API endpoint
 * 3. Validate response structure and data integrity
 * 4. Verify JWT tokens are properly issued
 * 5. Confirm initial account state (email_verified=false, is_super_admin=false)
 */
export async function test_api_admin_registration_with_valid_credentials(
  connection: api.IConnection,
) {
  // Generate valid admin registration data
  const registrationData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPass123!@#",
  } satisfies IRedditLikeAdmin.ICreate;

  // Call admin registration endpoint
  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationData,
    });

  // Validate the response structure (this validates ALL fields including tokens and formats)
  typia.assert(admin);

  // Verify admin profile data matches input
  TestValidator.equals(
    "username matches",
    admin.username,
    registrationData.username,
  );
  TestValidator.equals("email matches", admin.email, registrationData.email);
  TestValidator.equals(
    "email_verified is false initially",
    admin.email_verified,
    false,
  );
  TestValidator.equals(
    "is_super_admin is false for new admins",
    admin.is_super_admin,
    false,
  );
}
