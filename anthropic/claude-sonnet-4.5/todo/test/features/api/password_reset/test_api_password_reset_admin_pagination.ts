import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListPasswordReset";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test administrator pagination of password reset requests.
 *
 * This test validates that administrators can properly paginate through
 * password reset requests using page and limit parameters. It ensures:
 *
 * 1. Admin authentication and authorization
 * 2. Creation of multiple password reset requests for pagination testing
 * 3. Pagination metadata accuracy (current page, total records, total pages)
 * 4. Page boundary enforcement (correct number of results per page)
 * 5. Limit parameter controls result count (max 100)
 * 6. All records accessible through page iteration
 * 7. No duplicate records across different pages
 */
export async function test_api_password_reset_admin_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a user account to associate password resets with
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 3: Generate 15 password reset requests to test pagination
  const resetCount = 15;
  await ArrayUtil.asyncRepeat(resetCount, async () => {
    const resetResult =
      await api.functional.auth.user.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: userEmail,
          } satisfies ITodoListPasswordReset.IRequest,
        },
      );
    typia.assert(resetResult);
  });

  // Step 4: Test pagination with limit 5 - should have 3 pages
  const limit5Page1 =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(limit5Page1);

  // Validate first page metadata
  TestValidator.equals("page 1 current", limit5Page1.pagination.current, 1);
  TestValidator.equals(
    "total records",
    limit5Page1.pagination.records,
    resetCount,
  );
  TestValidator.equals(
    "total pages with limit 5",
    limit5Page1.pagination.pages,
    Math.ceil(resetCount / 5),
  );
  TestValidator.equals("page 1 limit respected", limit5Page1.data.length, 5);

  // Step 5: Retrieve second page with same limit
  const limit5Page2 =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: user.id,
      body: {
        page: 2,
        limit: 5,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(limit5Page2);

  // Validate second page metadata
  TestValidator.equals("page 2 current", limit5Page2.pagination.current, 2);
  TestValidator.equals(
    "page 2 total records",
    limit5Page2.pagination.records,
    resetCount,
  );
  TestValidator.equals("page 2 data length", limit5Page2.data.length, 5);

  // Verify no duplicate records between pages
  const page1Ids = limit5Page1.data.map((r) => r.id);
  const page2Ids = limit5Page2.data.map((r) => r.id);
  const duplicates = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals("no duplicates between pages", duplicates.length, 0);

  // Step 6: Test third page
  const limit5Page3 =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: user.id,
      body: {
        page: 3,
        limit: 5,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(limit5Page3);

  TestValidator.equals("page 3 current", limit5Page3.pagination.current, 3);
  TestValidator.equals("page 3 data length", limit5Page3.data.length, 5);

  // Step 7: Test with different limit (10) - should have 2 pages
  const limit10Page1 =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(limit10Page1);

  TestValidator.equals(
    "limit 10 page 1 current",
    limit10Page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 10 total pages",
    limit10Page1.pagination.pages,
    Math.ceil(resetCount / 10),
  );
  TestValidator.equals(
    "limit 10 page 1 data length",
    limit10Page1.data.length,
    10,
  );

  // Step 8: Test with limit 100 (maximum allowed)
  const limit100Page1 =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(limit100Page1);

  TestValidator.equals(
    "limit 100 current page",
    limit100Page1.pagination.current,
    1,
  );
  TestValidator.equals("limit 100 pages", limit100Page1.pagination.pages, 1);
  TestValidator.equals(
    "limit 100 returns all records",
    limit100Page1.data.length,
    resetCount,
  );

  // Step 9: Verify all records accessible by collecting all IDs across pages
  const allIds = new Set<string>();
  const totalPagesLimit5 = limit5Page1.pagination.pages;

  for (let pageNum = 1; pageNum <= totalPagesLimit5; pageNum++) {
    const pageResult =
      await api.functional.todoList.admin.users.passwordResets.index(
        connection,
        {
          userId: user.id,
          body: {
            page: pageNum,
            limit: 5,
          } satisfies ITodoListPasswordReset.IRequest,
        },
      );
    typia.assert(pageResult);

    pageResult.data.forEach((reset) => allIds.add(reset.id));
  }

  TestValidator.equals(
    "all records accessible through pagination",
    allIds.size,
    resetCount,
  );
}
