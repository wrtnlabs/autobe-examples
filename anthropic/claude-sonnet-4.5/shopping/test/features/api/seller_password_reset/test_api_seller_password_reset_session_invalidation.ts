import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test password reset workflow and basic session management.
 *
 * NOTE: This test validates the password reset request/confirm workflow and
 * basic session creation, but cannot fully test session invalidation due to API
 * limitations. The complete session invalidation validation would require:
 *
 * - Access to the actual password reset token (not exposed through test APIs)
 * - Database access to verify session revocation status
 * - Endpoints to validate existing session tokens
 *
 * Test Flow:
 *
 * 1. Create a new seller account
 * 2. Create multiple login sessions (simulating multiple devices)
 * 3. Request a password reset (validates email-based reset request)
 * 4. Verify that password reset request succeeds
 * 5. Verify that multiple sessions can be created for a seller
 *
 * What this test validates:
 *
 * - Seller registration and authentication workflow
 * - Multiple concurrent session creation
 * - Password reset request API functionality
 *
 * What this test cannot validate (due to API constraints):
 *
 * - Actual password reset confirmation (requires real token from system)
 * - Session invalidation after password reset (requires database access)
 * - Old token rejection after password change (requires session validation
 *   endpoint)
 */
export async function test_api_seller_password_reset_session_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Create a new seller account
  const originalPassword = "SecurePass123!@#";
  const sellerEmail = typia.random<string & tags.Format<"email">>();

  const registrationData = {
    email: sellerEmail,
    password: originalPassword,
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const registeredSeller = await api.functional.auth.seller.join(connection, {
    body: registrationData,
  });
  typia.assert(registeredSeller);

  TestValidator.equals(
    "seller registration returns expected structure",
    registeredSeller.email,
    sellerEmail,
  );

  // Step 2: Create multiple active sessions (simulating different devices/browsers)
  const sessionCount = 3;
  const sessions: IShoppingMallSeller.ILoginResponse[] = [];

  for (let i = 0; i < sessionCount; i++) {
    const loginResponse =
      await api.functional.shoppingMall.sellers.sessions.post(connection, {
        body: {
          email: sellerEmail,
          password: originalPassword,
        } satisfies IShoppingMallSeller.ILogin,
      });
    typia.assert(loginResponse);
    sessions.push(loginResponse);
  }

  TestValidator.equals(
    "created multiple concurrent sessions",
    sessions.length,
    sessionCount,
  );

  // Verify each session has unique ID and valid token structure
  for (let i = 0; i < sessions.length; i++) {
    TestValidator.predicate(
      `session ${i + 1} has valid ID`,
      sessions[i].id !== undefined && sessions[i].id.length > 0,
    );

    TestValidator.predicate(
      `session ${i + 1} has valid token structure`,
      sessions[i].token !== undefined &&
        sessions[i].token.access !== undefined &&
        sessions[i].token.refresh !== undefined,
    );
  }

  // Step 3: Request password reset token
  const resetRequestResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: sellerEmail,
        } satisfies IShoppingMallSeller.IPasswordResetRequest,
      },
    );
  typia.assert(resetRequestResponse);

  TestValidator.predicate(
    "password reset request returns success message",
    resetRequestResponse.message !== undefined &&
      resetRequestResponse.message.length > 0,
  );

  // Note: Further validation of session invalidation after password reset
  // cannot be implemented without:
  // 1. Access to the actual password reset token from the system
  // 2. Database access to verify session revocation status
  // 3. API endpoints to test session token validity after password change
}
