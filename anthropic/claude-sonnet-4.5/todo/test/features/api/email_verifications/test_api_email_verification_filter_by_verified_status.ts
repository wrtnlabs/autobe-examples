import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListEmailVerification";
import type { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test filtering email verification records by verification completion status.
 *
 * This scenario validates the ability to filter email verification records
 * based on whether the email has been verified or is still pending. The test
 * creates a user account with verification records, optionally verifies some
 * records, then queries with different filter values to ensure proper
 * status-based filtering.
 *
 * Test workflow:
 *
 * 1. Register a new user account to create initial pending verification records
 * 2. Query all verification records to establish baseline
 * 3. Query with verified=false filter to retrieve only pending verifications
 * 4. Validate that all returned records have verified=false status
 * 5. Query with verified=true to ensure no verified records exist initially
 *
 * This validates the status-based filtering capability essential for tracking
 * pending verifications versus completed ones.
 */
export async function test_api_email_verification_filter_by_verified_status(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account to create initial verification records
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Query all verification records for the user to establish baseline
  const allVerifications: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: registeredUser.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(allVerifications);

  // Step 3: Query with verified=false filter to retrieve only pending verifications
  const pendingVerifications: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: registeredUser.id,
        body: {
          page: 1,
          limit: 100,
          verified: false,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(pendingVerifications);

  // Step 4: Validate that all returned records have verified=false status
  if (pendingVerifications.data.length > 0) {
    for (const verification of pendingVerifications.data) {
      TestValidator.equals(
        "pending verification record should have verified=false",
        verification.verified,
        false,
      );
    }
  }

  // Step 5: Query with verified=true to retrieve only completed verifications
  const verifiedRecords: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: registeredUser.id,
        body: {
          page: 1,
          limit: 100,
          verified: true,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(verifiedRecords);

  // Validate that all returned records have verified=true status
  if (verifiedRecords.data.length > 0) {
    for (const verification of verifiedRecords.data) {
      TestValidator.equals(
        "verified verification record should have verified=true",
        verification.verified,
        true,
      );
    }
  }

  // Step 6: Verify the filter logic by ensuring counts are consistent
  const totalPendingCount = pendingVerifications.data.length;
  const totalVerifiedCount = verifiedRecords.data.length;

  TestValidator.equals(
    "total records should match sum of pending and verified",
    allVerifications.data.length,
    totalPendingCount + totalVerifiedCount,
  );
}
