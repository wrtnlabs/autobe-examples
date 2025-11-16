import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user authentication with malformed email addresses to ensure proper
 * input validation. Validates that the system properly rejects login attempts
 * with invalid email formats according to RFC 5322 standards before attempting
 * authentication. Verify that appropriate validation errors are returned for
 * malformed email addresses.
 */
export async function test_api_user_login_invalid_email_format(
  connection: api.IConnection,
) {
  // Create various malformed email formats to test input validation
  const invalidEmails = [
    "notanemail", // Missing @ symbol
    "@domain.com", // Missing local part
    "user@", // Missing domain part
    "user.domain.com", // Missing @ symbol
    "user@domain", // Missing TLD
    "user space@domain.com", // Space in local part
    "user@domain space.com", // Space in domain
    "user@@domain.com", // Double @ symbol
    "user@domain@com", // Multiple @ symbols
    ".user@domain.com", // Leading dot in local part
    "user.@domain.com", // Trailing dot in local part
    "user..name@domain.com", // Consecutive dots in local part
    "user@.domain.com", // Leading dot in domain
    "user@domain..com", // Consecutive dots in domain
    "user@domain.c", // TLD too short
    "user@-domain.com", // Dash at start of domain
    "user@domain-.com", // Dash at end of domain
  ];

  // Test each invalid email format
  for (const invalidEmail of invalidEmails) {
    // Create login request with malformed email
    const loginRequest = {
      email: invalidEmail,
      password: "validpassword123", // Use valid password to focus on email validation
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ILogin;

    // Expect authentication to fail due to invalid email format
    await TestValidator.error(
      `login should fail for invalid email format: ${invalidEmail}`,
      async () => {
        await api.functional.auth.user.login(connection, {
          body: loginRequest,
        });
      },
    );
  }

  // Verify that valid email format still works for comparison
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validLoginRequest = {
    email: validEmail,
    password: RandomGenerator.content({ paragraphs: 1 }),
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies ITodoAppUser.ILogin;

  // This should either succeed (if user exists) or fail with a different error
  // than email format validation error
  try {
    const response = await api.functional.auth.user.login(connection, {
      body: validLoginRequest,
    });
    // If login succeeds, validate response structure
    typia.assert(response);
  } catch (error) {
    // For valid format, error should NOT be about email format
    // It might fail due to invalid credentials, but not invalid email format
    TestValidator.predicate(
      "valid email format should not trigger email format error",
      error instanceof Error && !error.message.toLowerCase().includes("email"),
    );
  }
}
