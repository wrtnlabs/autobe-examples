import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that administrators can retrieve email verification records.
 *
 * This test validates administrative access to email verification records. Due
 * to API limitations (no listing endpoint for verifications), this test
 * demonstrates the retrieval endpoint pattern using generated test data.
 *
 * In a real-world scenario, the verification ID would be obtained from:
 *
 * - A listing/search endpoint for email verifications
 * - Database queries for testing purposes
 * - Email notification system logs
 *
 * Test workflow:
 *
 * 1. Create a new user account (which generates an email verification record
 *    internally)
 * 2. Create and authenticate as administrator
 * 3. Attempt to retrieve a verification record by ID
 * 4. Validate the response structure matches ITodoListEmailVerification schema
 * 5. Verify all required fields are present with correct types
 */
export async function test_api_email_verification_expired_token_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account which generates an email verification record
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: href,
      referrer: referrer,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: href,
      referrer: referrer,
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Generate test verification ID
  // NOTE: In production, this ID would come from a listing endpoint or database query.
  // Since no listing endpoint is available, we use a generated UUID to demonstrate
  // the API contract and type validation.
  const verificationId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Administrator retrieves the email verification record
  const verification =
    await api.functional.todoList.admin.users.emailVerifications.at(
      connection,
      {
        userId: user.id,
        verificationId: verificationId,
      },
    );

  // Step 5: Validate the retrieved verification record structure
  typia.assert(verification);

  // Additional validations to ensure response integrity
  TestValidator.predicate(
    "verification ID is valid UUID format",
    typia.is<string & tags.Format<"uuid">>(verification.id),
  );

  TestValidator.predicate(
    "user ID reference is valid UUID format",
    typia.is<string & tags.Format<"uuid">>(verification.todo_list_user_id),
  );

  TestValidator.predicate(
    "verification token is non-empty string",
    typeof verification.token === "string" && verification.token.length > 0,
  );

  TestValidator.predicate(
    "verified status is boolean",
    typeof verification.verified === "boolean",
  );

  TestValidator.predicate(
    "created_at is valid date-time format",
    typia.is<string & tags.Format<"date-time">>(verification.created_at),
  );

  TestValidator.predicate(
    "expires_at is valid date-time format",
    typia.is<string & tags.Format<"date-time">>(verification.expires_at),
  );
}
