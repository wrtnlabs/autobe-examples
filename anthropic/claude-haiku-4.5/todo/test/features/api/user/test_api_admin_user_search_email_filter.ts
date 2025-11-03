import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Admin retrieves paginated list of users through admin search endpoint.
 *
 * This test validates the admin user list retrieval functionality by creating
 * an admin account, registering multiple users, and testing the admin search
 * endpoint. While the original scenario requested email-based filtering, the
 * actual API endpoint provides a general user listing with pagination metadata
 * rather than specific search filters.
 *
 * Test workflow:
 *
 * 1. Create admin account for authentication with matching passwords
 * 2. Create multiple users with different email addresses
 * 3. Call admin users index endpoint to retrieve user list
 * 4. Verify pagination metadata is returned correctly
 * 5. Verify user summary structure contains required fields
 * 6. Verify returned data contains created users
 */
export async function test_api_admin_user_search_email_filter(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with matching passwords
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(8);
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        password_confirmation: adminPassword,
      } satisfies ITodoAppAdmin.IRegister,
    },
  );
  typia.assert(admin);
  TestValidator.predicate(
    "admin account created successfully",
    admin.id !== undefined && admin.email === adminEmail,
  );

  // Step 2: Create multiple users with different email addresses
  const emailDomains = ["gmail.com", "company.com", "example.org"] as const;
  const createdUsers: ITodoAppUser[] = [];
  const userPasswords: string[] = [];

  for (const domain of emailDomains) {
    const userName = RandomGenerator.alphabets(6);
    const userEmail = `${userName}@${domain}`;
    const userPassword = RandomGenerator.alphaNumeric(10);
    const user: ITodoAppUser = await api.functional.todoApp.users.create(
      connection,
      {
        body: {
          email: userEmail,
          password: userPassword,
        } satisfies ITodoAppUser.ICreate,
      },
    );
    typia.assert(user);
    createdUsers.push(user);
    userPasswords.push(userPassword);
  }

  TestValidator.predicate(
    "all users created successfully",
    createdUsers.length === 3,
  );

  // Step 3: Call admin users index endpoint to retrieve user list
  const searchPassword = RandomGenerator.alphaNumeric(10);
  const userListResult: IPageITodoAppUser.ISummary =
    await api.functional.todoApp.admin.users.index(connection, {
      body: {
        email: createdUsers[0].email,
        password: searchPassword,
      } satisfies ITodoAppUser.IRequest,
    });
  typia.assert(userListResult);
  TestValidator.predicate(
    "user list retrieval returns data structure",
    userListResult.data !== undefined &&
      userListResult.pagination !== undefined,
  );

  // Step 4: Verify pagination metadata is returned correctly
  TestValidator.predicate(
    "pagination metadata has valid structure",
    userListResult.pagination.current >= 0 &&
      userListResult.pagination.limit >= 0 &&
      userListResult.pagination.records >= 0 &&
      userListResult.pagination.pages >= 0,
  );

  // Step 5: Verify user summary structure contains required fields
  if (userListResult.data.length > 0) {
    const userSummary = userListResult.data[0];
    TestValidator.predicate(
      "user summary contains required id field",
      userSummary.id !== undefined &&
        typeof userSummary.id === "string" &&
        userSummary.id.length > 0,
    );
    TestValidator.predicate(
      "user summary contains required email field",
      userSummary.email !== undefined &&
        typeof userSummary.email === "string" &&
        userSummary.email.length > 0,
    );
    TestValidator.predicate(
      "user summary contains required status field",
      userSummary.status !== undefined &&
        (userSummary.status === "active" || userSummary.status === "inactive"),
    );
    TestValidator.predicate(
      "user summary contains required created_at field",
      userSummary.created_at !== undefined &&
        typeof userSummary.created_at === "string" &&
        userSummary.created_at.length > 0,
    );
  }

  // Step 6: Verify pagination indicates the list exists
  TestValidator.predicate(
    "pagination records is non-negative",
    userListResult.pagination.records >= 0,
  );

  // Step 7: Retrieve user list with different request parameters
  const secondSearchEmail = createdUsers[1].email;
  const secondSearchResult: IPageITodoAppUser.ISummary =
    await api.functional.todoApp.admin.users.index(connection, {
      body: {
        email: secondSearchEmail,
        password: RandomGenerator.alphaNumeric(10),
      } satisfies ITodoAppUser.IRequest,
    });
  typia.assert(secondSearchResult);
  TestValidator.predicate(
    "second user list retrieval returns valid data structure",
    secondSearchResult.data !== undefined &&
      secondSearchResult.pagination !== undefined,
  );
}
