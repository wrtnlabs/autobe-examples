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
 * Test that administrators can filter email verification records by their
 * verification status.
 *
 * This test validates the verified filter parameter works correctly and returns
 * only records matching the specified status (verified vs pending).
 *
 * Steps:
 *
 * 1. Create an admin account for authentication
 * 2. Create a user account which generates an initial pending verification
 * 3. Search for unverified (pending) email verifications using verified=false
 *    filter
 * 4. Validate that results contain only pending verification records
 * 5. Test the verified=true filter to find completed verifications
 * 6. Verify that the filter correctly segregates verified and unverified records
 */
export async function test_api_email_verification_admin_filter_by_verified_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        ip: "127.0.0.1",
        href: "https://admin.test.com/join",
        referrer: "https://admin.test.com",
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a user account which generates an initial pending verification
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "userPassword123",
        ip: "192.168.1.1",
        href: "https://app.test.com/signup",
        referrer: "https://app.test.com",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 3: Search for unverified (pending) email verifications using verified=false filter
  const unverifiedResults: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.admin.users.emailVerifications.index(
      connection,
      {
        userId: user.id,
        body: {
          page: 1,
          limit: 10,
          verified: false,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(unverifiedResults);

  // Step 4: Validate that results contain only pending verification records
  TestValidator.predicate(
    "unverified results should contain at least one record",
    unverifiedResults.data.length > 0,
  );

  // Verify all returned records have verified=false
  for (const verification of unverifiedResults.data) {
    TestValidator.equals(
      "verification status should be false (pending)",
      verification.verified,
      false,
    );
  }

  // Step 5: Test the verified=true filter to find completed verifications
  const verifiedResults: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.admin.users.emailVerifications.index(
      connection,
      {
        userId: user.id,
        body: {
          page: 1,
          limit: 10,
          verified: true,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(verifiedResults);

  // Step 6: Verify that the filter correctly segregates verified and unverified records
  // Since we just created the user, there should be no verified records yet
  TestValidator.equals(
    "verified results should be empty for newly created user",
    verifiedResults.data.length,
    0,
  );

  // Verify pagination metadata is correct
  TestValidator.predicate(
    "unverified pagination current page should be 1",
    unverifiedResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "unverified pagination limit should be 10",
    unverifiedResults.pagination.limit === 10,
  );
}
