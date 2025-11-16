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
 * Test filtering email verification records by token expiration status to
 * identify expired versus active verification tokens. This scenario validates:
 *
 * 1. Create a user account to generate initial email verification records
 * 2. Filter email verification records using the expired=true parameter to
 *    retrieve only expired tokens
 * 3. Verify that all returned records have expires_at timestamps in the past
 *    (expired tokens)
 * 4. Filter email verification records using the expired=false parameter to
 *    retrieve only active tokens
 * 5. Verify that all returned records have expires_at timestamps in the future
 *    (active/valid tokens)
 * 6. Confirm that the API correctly categorizes verification records based on
 *    current time comparison with expires_at
 *
 * This test ensures the time-based filtering functionality works correctly for
 * email verification workflows, which is critical for identifying tokens that
 * need regeneration versus those still valid for account activation.
 */
export async function test_api_email_verification_filter_by_expiration_status(
  connection: api.IConnection,
) {
  // Step 1: Create a user account with email verification records
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userHref = typia.random<string & tags.Format<"uri">>();
  const userReferrer = typia.random<string & tags.Format<"uri">>();

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: userHref,
        referrer: userReferrer,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(createdUser);

  // Step 2: Retrieve all email verification records without filtering to understand baseline
  const allVerificationsPage: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: createdUser.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(allVerificationsPage);

  TestValidator.predicate(
    "user should have email verification records",
    allVerificationsPage.data.length > 0,
  );

  // Step 3: Filter for expired tokens (expired=true)
  const expiredVerificationsPage: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: createdUser.id,
        body: {
          page: 1,
          limit: 100,
          expired: true,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(expiredVerificationsPage);

  // Step 4: Verify all returned records are actually expired (if any exist)
  const currentTime = new Date();
  for (const verification of expiredVerificationsPage.data) {
    const expiresAt = new Date(verification.expires_at);
    TestValidator.predicate(
      "expired filter should return only tokens with expires_at in the past",
      expiresAt < currentTime,
    );
  }

  // Step 5: Filter for active tokens (expired=false)
  const activeVerificationsPage: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: createdUser.id,
        body: {
          page: 1,
          limit: 100,
          expired: false,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(activeVerificationsPage);

  // Step 6: Verify all returned records are active (not expired)
  for (const verification of activeVerificationsPage.data) {
    const expiresAt = new Date(verification.expires_at);
    TestValidator.predicate(
      "active filter should return only tokens with expires_at in the future",
      expiresAt >= currentTime,
    );
  }

  // Step 7: Verify that expired and active counts sum up correctly
  // For newly created users, we expect most/all tokens to be active (not expired)
  const totalFiltered =
    expiredVerificationsPage.data.length + activeVerificationsPage.data.length;
  TestValidator.equals(
    "sum of expired and active tokens should equal total verification records",
    totalFiltered,
    allVerificationsPage.data.length,
  );

  // Step 8: Verify that for a newly created user, active tokens should dominate
  TestValidator.predicate(
    "newly created user should have active verification tokens",
    activeVerificationsPage.data.length > 0,
  );
}
