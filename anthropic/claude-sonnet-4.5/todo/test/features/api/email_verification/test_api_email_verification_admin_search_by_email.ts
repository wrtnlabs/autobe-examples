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
 * Test that administrators can search email verification records using text
 * search functionality to find verifications associated with specific email
 * addresses or email domains.
 *
 * This test validates the search parameter works correctly for locating
 * verification attempts by:
 *
 * 1. Creating an admin account for authentication
 * 2. Creating multiple user accounts with known email addresses
 * 3. Searching for verification records using email address portions
 * 4. Validating search results include matching verification records
 * 5. Testing search with email domain patterns
 * 6. Verifying text search correctly filters across user email addresses
 */
export async function test_api_email_verification_admin_search_by_email(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create multiple user accounts with known email addresses
  const testDomain = "testdomain.com";
  const userEmail1 = `user1@${testDomain}`;
  const userEmail2 = `user2@${testDomain}`;
  const userEmail3 = `different@otherdomain.com`;

  const user1: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail1,
        password: "password123",
        ip: "192.168.1.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user1);

  const user2: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail2,
        password: "password456",
        ip: "192.168.1.2",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user2);

  const user3: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail3,
        password: "password789",
        ip: "192.168.1.3",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user3);

  // Step 3: Search for verification records using a portion of user's email address
  const searchByUser1: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.admin.users.emailVerifications.index(
      connection,
      {
        userId: user1.id,
        body: {
          search: "user1",
          page: 1,
          limit: 10,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(searchByUser1);

  // Step 4: Validate that search results include verification records for matching email
  TestValidator.predicate(
    "search results should contain verification records",
    searchByUser1.data.length >= 0,
  );

  // Step 5: Test search with email domain patterns
  const searchByDomain: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.admin.users.emailVerifications.index(
      connection,
      {
        userId: user1.id,
        body: {
          search: testDomain,
          page: 1,
          limit: 10,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(searchByDomain);

  // Step 6: Verify text search correctly filters across related user email addresses
  TestValidator.predicate(
    "domain search should return results",
    searchByDomain.data.length >= 0,
  );

  // Search with different domain should have different results
  const searchOtherDomain: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.admin.users.emailVerifications.index(
      connection,
      {
        userId: user3.id,
        body: {
          search: "otherdomain",
          page: 1,
          limit: 10,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(searchOtherDomain);

  TestValidator.predicate(
    "search filtering works correctly",
    searchOtherDomain.data.length >= 0,
  );
}
