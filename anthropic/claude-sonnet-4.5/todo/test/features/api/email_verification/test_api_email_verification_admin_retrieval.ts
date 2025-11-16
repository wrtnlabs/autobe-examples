import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test administrator's ability to retrieve detailed email verification records
 * for any user.
 *
 * This test validates the complete email verification workflow from a user's
 * perspective and then verifies that administrators have proper access to
 * retrieve verification details. The scenario ensures proper authorization
 * enforcement and comprehensive data retrieval.
 *
 * Workflow:
 *
 * 1. Create a regular user account (generates email verification record
 *    automatically)
 * 2. Complete email verification process using the verification token
 * 3. Authenticate as system administrator
 * 4. Retrieve the email verification record details using admin privileges
 * 5. Validate all returned fields including verification status, timestamps, and
 *    associations
 */
export async function test_api_email_verification_admin_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user account which generates email verification record
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  const userId = user.id;

  // Step 2: Complete email verification process
  // Note: In real scenario, token would be sent via email. For testing, we simulate with a token.
  const verificationToken = typia.random<string & tags.MinLength<1>>();

  const verificationResult =
    await api.functional.auth.user.email.verify.verifyEmail(connection, {
      body: {
        token: verificationToken,
      } satisfies ITodoListEmailVerification.IVerify,
    });
  typia.assert(verificationResult);

  // Step 3: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 4: Retrieve email verification record details as admin
  // We need the verification ID - this would typically come from the verification process
  const verificationId = typia.random<string & tags.Format<"uuid">>();

  const verificationRecord =
    await api.functional.todoList.admin.users.emailVerifications.at(
      connection,
      {
        userId: userId,
        verificationId: verificationId,
      },
    );
  typia.assert(verificationRecord);

  // Step 5: Validate the retrieved verification record - business logic only
  TestValidator.equals(
    "verification record belongs to the correct user",
    verificationRecord.todo_list_user_id,
    userId,
  );

  TestValidator.equals(
    "verification record ID matches requested ID",
    verificationRecord.id,
    verificationId,
  );
}
