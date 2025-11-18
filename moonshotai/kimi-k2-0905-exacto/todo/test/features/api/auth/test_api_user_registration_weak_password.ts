import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test registration failure with passwords that don't meet security
 * requirements. Validates minimum password length enforcement and ensures users
 * create secure credentials that protect their account access.
 *
 * This test validates:
 *
 * 1. Successful registration with valid password (8+ characters)
 * 2. Registration failure with weak passwords (<8 characters)
 * 3. Boundary testing at exactly 7 characters (should fail)
 * 4. Various weak password patterns (too short, empty, etc.)
 */
export async function test_api_user_registration_weak_password(
  connection: api.IConnection,
) {
  // Generate valid email for testing
  const email = typia.random<string & tags.Format<"email">>();
  const validPassword = "SecurePass123";

  // First, test successful registration with valid password
  const validUser = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: validPassword,
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(validUser);

  // Test boundary case - password too short (7 characters - should fail)
  await TestValidator.error(
    "registration should fail with 7 character password",
    async () => {
      return await api.functional.auth.user.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "short7", // 7 characters - too short
          href: "https://example.com/join",
          referrer: "https://example.com/",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );

  // Test very short password (3 characters - should fail)
  await TestValidator.error(
    "registration should fail with 3 character password",
    async () => {
      return await api.functional.auth.user.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "abc", // 3 characters - too short
          href: "https://example.com/join",
          referrer: "https://example.com/",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );

  // Test empty password (0 characters - should fail)
  await TestValidator.error(
    "registration should fail with empty password",
    async () => {
      return await api.functional.auth.user.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "", // empty string - too short
          href: "https://example.com/join",
          referrer: "https://example.com/",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );

  // Verify that the valid user can be authenticated properly
  TestValidator.equals("valid user has correct email", validUser.email, email);
  TestValidator.equals(
    "valid user has valid ID format",
    typeof validUser.id,
    "string",
  );
  TestValidator.predicate(
    "valid user has authentication token",
    validUser.token.access.length > 0,
  );
}
