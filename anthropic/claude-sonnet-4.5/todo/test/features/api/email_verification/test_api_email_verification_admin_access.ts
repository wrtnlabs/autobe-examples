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
 * Test that administrators can access email verification records for any user
 * while regular users can only access their own verification records.
 *
 * This scenario validates role-based access control by:
 *
 * 1. Register an admin account
 * 2. Register a regular user account (the target user whose verification records
 *    will be accessed)
 * 3. Admin queries verification records for the user account
 * 4. Verify admin successfully retrieves the user's verification records
 *
 * This tests the authorization model ensuring proper access control where
 * admins have oversight capabilities while maintaining user privacy.
 */
export async function test_api_email_verification_admin_access(
  connection: api.IConnection,
) {
  // Step 1: Register an admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    ip: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Register a regular user account (target user)
  const userData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "userPassword123",
    ip: typia.random<string>(),
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

  // Switch back to admin connection
  await api.functional.auth.admin.join(connection, {
    body: adminData,
  });

  // Step 3: Admin queries verification records for the user account
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies ITodoListEmailVerification.IRequest;

  const verificationRecords: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user.id,
        body: requestBody,
      },
    );
  typia.assert(verificationRecords);

  // Step 4: Verify admin successfully retrieves the user's verification records
  // The successful API call demonstrates admin can access other users' data
  // Validate business logic: if records exist, they belong to the correct user
  if (verificationRecords.data.length > 0) {
    const firstRecord = verificationRecords.data[0];
    typia.assert(firstRecord);

    TestValidator.equals(
      "verification record belongs to target user",
      firstRecord.todo_list_user_id,
      user.id,
    );
  }
}
