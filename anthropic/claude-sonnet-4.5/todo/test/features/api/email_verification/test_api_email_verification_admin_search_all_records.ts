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
 * Test that administrators can retrieve a complete list of all email
 * verification records for a specific user without any filters.
 *
 * This test validates the basic pagination functionality and ensures all
 * verification records are accessible to admins. It verifies the admin's
 * ability to audit and monitor email verification history for user accounts.
 *
 * Steps:
 *
 * 1. Create an admin account via join endpoint
 * 2. Create a user account via join endpoint to have a target user with
 *    verification records
 * 3. Retrieve all email verification records for that user using the admin
 *    endpoint with minimal request parameters
 * 4. Validate that the response contains pagination metadata and verification
 *    record summaries
 * 5. Verify that the admin can access verification records they did not create
 */
export async function test_api_email_verification_admin_search_all_records(
  connection: api.IConnection,
) {
  // Step 1: Create an admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a user account (this automatically generates email verification records)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "user1234";

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 3: Retrieve all email verification records as admin (admin is already authenticated from Step 1)
  const verificationRecords: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.admin.users.emailVerifications.index(
      connection,
      {
        userId: user.id,
        body: {} satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(verificationRecords);

  // Step 4: Validate business logic - all records belong to the correct user
  TestValidator.predicate(
    "should have at least one verification record",
    verificationRecords.data.length > 0,
  );

  // Step 5: Verify that all verification records belong to the target user
  for (const record of verificationRecords.data) {
    TestValidator.equals(
      "verification record should belong to target user",
      record.todo_list_user_id,
      user.id,
    );
  }

  // Verify pagination metadata is present and valid
  TestValidator.predicate(
    "pagination records count should match data array length or be greater",
    verificationRecords.pagination.records >= verificationRecords.data.length,
  );
}
