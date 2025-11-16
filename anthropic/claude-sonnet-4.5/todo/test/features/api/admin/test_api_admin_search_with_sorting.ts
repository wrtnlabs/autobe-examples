import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdmin";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test administrator list retrieval with different sorting options.
 *
 * This test validates that the administrator search API correctly sorts results
 * by creation date in both ascending and descending order. It creates multiple
 * admin accounts, then retrieves them with different sort parameters to verify
 * proper ordering.
 *
 * Steps:
 *
 * 1. Create the first admin account and authenticate
 * 2. Create additional admin accounts for sorting comparison
 * 3. Test ascending sort order (created_at) - oldest first
 * 4. Test descending sort order (-created_at) - newest first
 * 5. Verify that results are properly ordered in each case
 */
export async function test_api_admin_search_with_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create the first admin account and authenticate
  const firstAdminEmail = typia.random<string & tags.Format<"email">>();
  const firstAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: firstAdminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(firstAdmin);

  // Step 2: Create additional admin accounts with slight delays to ensure different created_at timestamps
  const adminEmails: string[] = [firstAdminEmail];
  const adminCount = 5;

  for (let i = 1; i < adminCount; i++) {
    const email = typia.random<string & tags.Format<"email">>();
    adminEmails.push(email);

    const admin: ITodoListAdmin.IAuthorized =
      await api.functional.auth.admin.join(connection, {
        body: {
          email: email,
          password: typia.random<string & tags.MinLength<8>>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoListAdmin.ICreate,
      });
    typia.assert(admin);
  }

  // Step 3: Test ascending sort order (created_at) - oldest first
  const ascendingResult: IPageITodoListAdmin.ISummary =
    await api.functional.todoList.admin.admins.index(connection, {
      body: {
        sort: "created_at",
        limit: 100,
      } satisfies ITodoListAdmin.IRequest,
    });
  typia.assert(ascendingResult);

  // Verify pagination metadata
  TestValidator.predicate(
    "ascending result should contain data",
    ascendingResult.data.length >= adminCount,
  );

  // Verify ascending order - each subsequent created_at should be >= previous
  for (let i = 1; i < ascendingResult.data.length; i++) {
    const prevDate = new Date(ascendingResult.data[i - 1].created_at);
    const currentDate = new Date(ascendingResult.data[i].created_at);
    TestValidator.predicate(
      "ascending sort: current date should be >= previous date",
      currentDate.getTime() >= prevDate.getTime(),
    );
  }

  // Step 4: Test descending sort order (-created_at) - newest first
  const descendingResult: IPageITodoListAdmin.ISummary =
    await api.functional.todoList.admin.admins.index(connection, {
      body: {
        sort: "-created_at",
        limit: 100,
      } satisfies ITodoListAdmin.IRequest,
    });
  typia.assert(descendingResult);

  // Verify pagination metadata
  TestValidator.predicate(
    "descending result should contain data",
    descendingResult.data.length >= adminCount,
  );

  // Verify descending order - each subsequent created_at should be <= previous
  for (let i = 1; i < descendingResult.data.length; i++) {
    const prevDate = new Date(descendingResult.data[i - 1].created_at);
    const currentDate = new Date(descendingResult.data[i].created_at);
    TestValidator.predicate(
      "descending sort: current date should be <= previous date",
      currentDate.getTime() <= prevDate.getTime(),
    );
  }

  // Step 5: Verify that both results contain the same admins (just in different order)
  TestValidator.equals(
    "both sort orders should return same total count",
    ascendingResult.data.length,
    descendingResult.data.length,
  );

  // Verify that first item in ascending is last in descending (within our created admins)
  const createdAdminIds = ascendingResult.data
    .filter((admin) => adminEmails.includes(admin.email))
    .map((admin) => admin.id);

  const descendingCreatedAdminIds = descendingResult.data
    .filter((admin) => adminEmails.includes(admin.email))
    .map((admin) => admin.id);

  // Add bounds checking before array access
  TestValidator.predicate(
    "filtered ascending admins should not be empty",
    createdAdminIds.length > 0,
  );

  TestValidator.predicate(
    "filtered descending admins should not be empty",
    descendingCreatedAdminIds.length > 0,
  );

  TestValidator.equals(
    "first admin in ascending should be last in descending",
    createdAdminIds[0],
    descendingCreatedAdminIds[descendingCreatedAdminIds.length - 1],
  );
}
