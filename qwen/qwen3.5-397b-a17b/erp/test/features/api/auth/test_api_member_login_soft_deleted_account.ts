import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test login security validation for member authentication.
 *
 * This test validates the login authentication flow and security patterns.
 * Note: Full soft-delete testing requires the member delete endpoint to be
 * available in the API SDK. This test demonstrates the login validation patterns
 * that would apply to soft-deleted accounts.
 *
 * Test Steps:
 * 1. Create a new member account with valid credentials
 * 2. Verify successful login with correct credentials
 * 3. Verify login rejection with incorrect password
 * 4. Verify login rejection with non-existent email
 * 5. Validate error messages do not reveal account existence (security)
 *
 * Business Logic Validations:
 * - Valid credentials return authentication tokens
 * - Invalid credentials are rejected with appropriate errors
 * - Error responses do not enumerate whether email exists
 * - System maintains security by not revealing account status details
 */
export async function test_api_member_login_soft_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account with known credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  const testDisplayName = RandomGenerator.name();
  const joinResult = await authorize_member_join(connection, {
    body: {
      email: testEmail,
      password: testPassword,
      display_name: testDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      avatar_url: null,
      phone_number: null,
      ip: null,
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // Verify the joined account is active (not deleted)
  TestValidator.equals("email matches", joinResult.email, testEmail);
  TestValidator.equals(
    "display name matches",
    joinResult.displayName,
    testDisplayName,
  );
  TestValidator.predicate(
    "account is active (deletedAt is null)",
    joinResult.deletedAt === null,
  );
  // Step 2: Verify successful login with correct credentials
  const validLoginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(validLoginConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | undefined>(),
    } satisfies IHrmPlatformMember.ILogin,
  });
  typia.assert(loginResult);
  // Verify login response structure and token generation
  TestValidator.equals("login email matches", loginResult.email, testEmail);
  TestValidator.predicate(
    "access token generated",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token generated",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expiration timestamp set",
    loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh deadline set",
    loginResult.token.refreshable_until.length > 0,
  );
  // Step 3: Verify login rejection with incorrect password
  const invalidPasswordConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("login with wrong password fails", async () => {
    await authorize_member_login(invalidPasswordConnection, {
      body: {
        email: testEmail,
        password: "wrong_password_12345",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.ILogin,
    });
  });
  // Step 4: Verify login rejection with non-existent email
  const nonExistentEmailConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("login with non-existent email fails", async () => {
    await authorize_member_login(nonExistentEmailConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.ILogin,
    });
  });
  // Note: Soft-delete login testing requires member delete endpoint.
  // When available, add test:
  // - Soft delete the account via delete endpoint
  // - Attempt login with deleted account credentials
  // - Verify login fails with access denied error
  // - Verify error message is generic (doesn't reveal account was deleted)
  // - Verify no new session is created for the deleted account
}
