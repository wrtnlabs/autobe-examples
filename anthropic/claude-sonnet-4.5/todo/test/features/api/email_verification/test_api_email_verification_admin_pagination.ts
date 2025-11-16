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
 * Test pagination functionality for email verification records.
 *
 * Validates that administrators can efficiently navigate through email
 * verification records using pagination parameters. Tests page navigation,
 * limit settings, and pagination metadata accuracy.
 *
 * Workflow:
 *
 * 1. Create and authenticate admin account
 * 2. Create multiple users to generate verification records
 * 3. Test first page with small limit
 * 4. Validate pagination metadata
 * 5. Navigate to subsequent pages
 * 6. Verify correct data chunking
 */
export async function test_api_email_verification_admin_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
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

  // Step 2: Create multiple user accounts to generate verification records
  const userCount = 5;
  const createdUsers: ITodoListUser.IAuthorized[] = await ArrayUtil.asyncRepeat(
    userCount,
    async (index) => {
      const userEmail = typia.random<string & tags.Format<"email">>();
      const user: ITodoListUser.IAuthorized =
        await api.functional.auth.user.join(connection, {
          body: {
            email: userEmail,
            password: "password123",
            ip: "192.168.1.1",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies ITodoListUser.ICreate,
        });
      typia.assert(user);
      return user;
    },
  );

  // Verify we created the expected number of users
  TestValidator.equals("created users count", createdUsers.length, userCount);

  // Step 3: Retrieve first page with small limit
  const pageLimit = 2;
  const firstUserId = createdUsers[0].id;

  const firstPage: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.admin.users.emailVerifications.index(
      connection,
      {
        userId: firstUserId,
        body: {
          page: 1,
          limit: pageLimit,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(firstPage);

  // Step 4: Validate pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals(
    "first page limit",
    firstPage.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "first page has records",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page data length matches limit or less",
    firstPage.data.length <= pageLimit,
  );

  // Calculate expected pages
  const expectedPages = Math.ceil(firstPage.pagination.records / pageLimit);
  TestValidator.equals(
    "total pages calculation",
    firstPage.pagination.pages,
    expectedPages,
  );

  // Step 5: Navigate to second page if there are enough records
  if (firstPage.pagination.pages > 1) {
    const secondPage: IPageITodoListEmailVerification.ISummary =
      await api.functional.todoList.admin.users.emailVerifications.index(
        connection,
        {
          userId: firstUserId,
          body: {
            page: 2,
            limit: pageLimit,
          } satisfies ITodoListEmailVerification.IRequest,
        },
      );
    typia.assert(secondPage);

    // Step 6: Validate second page metadata
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit",
      secondPage.pagination.limit,
      pageLimit,
    );
    TestValidator.equals(
      "second page total records",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "second page total pages",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );

    // Verify different data between pages (if both have data)
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      const firstPageIds = firstPage.data.map((v) => v.id);
      const secondPageIds = secondPage.data.map((v) => v.id);

      TestValidator.predicate(
        "pages contain different records",
        !secondPageIds.some((id) => firstPageIds.includes(id)),
      );
    }
  }

  // Test with different limit values
  const largeLimitPage: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.admin.users.emailVerifications.index(
      connection,
      {
        userId: firstUserId,
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(largeLimitPage);

  TestValidator.equals(
    "large limit page current",
    largeLimitPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "large limit value",
    largeLimitPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "large limit data length",
    largeLimitPage.data.length <= 10,
  );
}
