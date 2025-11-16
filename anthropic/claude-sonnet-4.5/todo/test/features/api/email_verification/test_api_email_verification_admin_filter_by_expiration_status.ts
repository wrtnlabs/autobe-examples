import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListEmailVerification";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that administrators can filter email verification records based on
 * whether tokens are expired or still active.
 *
 * This test validates the expired filter parameter and helps admins identify
 * tokens that need to be regenerated.
 *
 * Steps:
 *
 * 1. Create an admin account for authentication
 * 2. Create a user account to generate verification records
 * 3. Search for non-expired verification tokens using expired=false filter
 * 4. Validate that results contain only tokens where expires_at is in the future
 * 5. Verify that the expiration filter correctly categorizes tokens by their
 *    validity period
 */
export async function test_api_email_verification_admin_filter_by_expiration_status(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create a user account to generate verification records
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userData = {
    email: userEmail,
    password: "testPassword123",
    ip: "192.168.1.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: userData,
    },
  );
  typia.assert(user);

  // Step 3: Search for non-expired verification tokens using expired=false filter
  const searchRequest = {
    page: 1,
    limit: 10,
    expired: false,
  } satisfies ITodoListEmailVerification.IRequest;

  const nonExpiredResults: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.admin.users.emailVerifications.index(
      connection,
      {
        userId: user.id,
        body: searchRequest,
      },
    );
  typia.assert(nonExpiredResults);

  // Step 4: Validate that results contain only tokens where expires_at is in the future
  const currentTime = new Date();
  for (const verification of nonExpiredResults.data) {
    const expirationTime = new Date(verification.expires_at);
    TestValidator.predicate(
      "verification token expires_at should be in the future",
      expirationTime > currentTime,
    );
  }

  // Step 5: Verify pagination metadata is valid
  TestValidator.predicate(
    "pagination current page should be valid",
    nonExpiredResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    nonExpiredResults.pagination.records >= 0,
  );
}
