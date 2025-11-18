import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test registration failure when attempting to create account with already
 * registered email address. Validates system prevents duplicate accounts and
 * maintains email uniqueness across the user base.
 */
export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate unique email for first user registration
  const email = typia.random<string & tags.Format<"email">>();

  // Create first user account successfully
  const firstUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password: "StrongPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com/login",
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(firstUser);

  // Verify first user was created successfully
  TestValidator.equals("First user email matches", firstUser.email, email);
  TestValidator.predicate("First user has valid ID", firstUser.id.length > 0);
  TestValidator.predicate(
    "First user has token",
    firstUser.token.access.length > 0,
  );

  // Attempt to create duplicate account with same email - should fail
  try {
    // Reset connection headers to remove authorization from first registration
    const cleanConnection: api.IConnection = { ...connection, headers: {} };

    await api.functional.auth.user.join(cleanConnection, {
      body: {
        email,
        password: "DifferentPassword456!",
        href: "https://example.com/register",
        referrer: "https://example.com/login",
      } satisfies ITodoAppUser.IJoin,
    });

    // If we reach here, the duplicate registration was incorrectly allowed
    throw new Error("Duplicate registration should have failed");
  } catch (error) {
    // Verify the error is appropriate (should be an HttpError indicating duplicate)
    TestValidator.predicate(
      "Error should indicate duplicate user",
      error !== undefined,
    );

    // Validate that the error response includes meaningful feedback about duplicate email
    if (error && typeof error === "object" && "toJSON" in error) {
      const errorData = (error as any).toJSON();
      TestValidator.predicate(
        "Error message should reference email or duplicate",
        JSON.stringify(errorData).toLowerCase().includes("duplicate") ||
          JSON.stringify(errorData).toLowerCase().includes("email") ||
          JSON.stringify(errorData).toLowerCase().includes("already exists"),
      );
    }
  }
}
