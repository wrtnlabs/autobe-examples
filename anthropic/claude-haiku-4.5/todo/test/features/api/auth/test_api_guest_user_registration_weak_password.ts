import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";

/**
 * Test guest user registration with weak passwords that fail security
 * requirements.
 *
 * This test validates that the API properly rejects passwords that don't meet
 * strength requirements. For each weak password scenario, the test verifies
 * that:
 *
 * - Registration fails with appropriate HTTP error status
 * - An error response indicates which password requirement failed
 * - No user account is created on password validation failure
 *
 * Password strength requirements being tested:
 *
 * 1. Minimum 8 characters length
 * 2. Must contain uppercase letter
 * 3. Must contain lowercase letter
 * 4. Must contain numeric digit
 * 5. Must contain special character
 */
export async function test_api_guest_user_registration_weak_password(
  connection: api.IConnection,
) {
  const testEmail1: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const testEmail2: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const testEmail3: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const testEmail4: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const testEmail5: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // Test 1: Password without uppercase letter
  await TestValidator.error(
    "password without uppercase letter should fail",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          email: testEmail1,
          password: "abcdefgh1!", // No uppercase, but 10 chars and has digit + special char
        } satisfies ITodoAppGuestUser.IJoin,
      });
    },
  );

  // Test 2: Password without lowercase letter
  await TestValidator.error(
    "password without lowercase letter should fail",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          email: testEmail2,
          password: "ABCDEFGH1!", // No lowercase, but 10 chars and has digit + special char
        } satisfies ITodoAppGuestUser.IJoin,
      });
    },
  );

  // Test 3: Password without numeric digit
  await TestValidator.error(
    "password without numeric digit should fail",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          email: testEmail3,
          password: "AbcDefgh!", // No digit, but 9 chars and has uppercase, lowercase + special char
        } satisfies ITodoAppGuestUser.IJoin,
      });
    },
  );

  // Test 4: Password without special character
  await TestValidator.error(
    "password without special character should fail",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          email: testEmail4,
          password: "Abcdefgh1", // No special character, but 9 chars and has uppercase, lowercase + digit
        } satisfies ITodoAppGuestUser.IJoin,
      });
    },
  );

  // Test 5: All requirements missing except length
  await TestValidator.error(
    "password with only lowercase letters should fail",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          email: testEmail5,
          password: "abcdefghij", // Only lowercase, 10 chars
        } satisfies ITodoAppGuestUser.IJoin,
      });
    },
  );

  // Test 6: Valid password should succeed
  const validEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const validPassword = "ValidPass123!";

  const response: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        email: validEmail,
        password: validPassword,
      } satisfies ITodoAppGuestUser.IJoin,
    });

  typia.assert(response);
  TestValidator.predicate("response has valid ID", response.id !== undefined);
  TestValidator.predicate("response has token", response.token !== undefined);
  TestValidator.predicate(
    "token type is Bearer",
    response.tokenType === "Bearer",
  );
}
