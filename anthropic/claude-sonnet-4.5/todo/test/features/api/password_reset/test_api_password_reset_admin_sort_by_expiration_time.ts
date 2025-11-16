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
 * Test administrator's ability to sort password reset requests by expiration
 * timestamp.
 *
 * This test validates that administrators can query password reset requests
 * with sorting applied by expiration time. Two sort orders are tested:
 *
 * 1. Ascending (expires_at_asc): Shows tokens expiring soonest first - useful for
 *    identifying tokens that need immediate attention or are about to expire
 * 2. Descending (expires_at_desc): Shows tokens with furthest expiration first -
 *    useful for viewing the most recently created or longest-valid tokens
 *
 * Test Flow:
 *
 * 1. Create and authenticate as administrator
 * 2. Create a single test user account
 * 3. Generate multiple password reset requests for that user
 * 4. Query with ascending sort and validate order
 * 5. Query with descending sort and validate order
 * 6. Verify pagination metadata and data integrity
 */
export async function test_api_password_reset_admin_sort_by_expiration_time(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
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

  // Step 2: Create a single test user
  const userData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    ip: "127.0.0.1",
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

  // Step 3: Create multiple password reset requests for the same user
  const resetCount = 5;
  for (let i = 0; i < resetCount; i++) {
    const resetRequest: ITodoListPasswordReset.IRequestResult =
      await api.functional.auth.user.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: userData.email,
          } satisfies ITodoListPasswordReset.IRequest,
        },
      );
    typia.assert(resetRequest);
  }

  // Step 4: Query password reset requests with ascending sort (expires_at_asc)
  const ascendingSort: IPageITodoListPasswordReset.ISummary =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: user.id,
      body: {
        sort: "expires_at_asc",
        page: 1,
        limit: 10,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(ascendingSort);

  // Step 5: Verify we have multiple records to test sorting
  TestValidator.predicate(
    "should have multiple password reset records",
    ascendingSort.data.length >= 2,
  );

  // Step 6: Verify all returned records belong to the correct user
  for (const reset of ascendingSort.data) {
    TestValidator.equals(
      "password reset record belongs to queried user",
      reset.todo_list_user_id,
      user.id,
    );
  }

  // Step 7: Verify ascending sort order
  for (let i = 0; i < ascendingSort.data.length - 1; i++) {
    const current = new Date(ascendingSort.data[i].expires_at);
    const next = new Date(ascendingSort.data[i + 1].expires_at);

    TestValidator.predicate(
      "ascending sort: current expiration should be <= next expiration",
      current.getTime() <= next.getTime(),
    );
  }

  // Step 8: Query password reset requests with descending sort (expires_at_desc)
  const descendingSort: IPageITodoListPasswordReset.ISummary =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: user.id,
      body: {
        sort: "expires_at_desc",
        page: 1,
        limit: 10,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(descendingSort);

  // Step 9: Verify descending sort order
  for (let i = 0; i < descendingSort.data.length - 1; i++) {
    const current = new Date(descendingSort.data[i].expires_at);
    const next = new Date(descendingSort.data[i + 1].expires_at);

    TestValidator.predicate(
      "descending sort: current expiration should be >= next expiration",
      current.getTime() >= next.getTime(),
    );
  }

  // Step 10: Verify pagination metadata
  TestValidator.predicate(
    "ascending result has valid pagination",
    ascendingSort.pagination.current >= 0 &&
      ascendingSort.pagination.limit > 0 &&
      ascendingSort.pagination.records >= 0 &&
      ascendingSort.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "descending result has valid pagination",
    descendingSort.pagination.current >= 0 &&
      descendingSort.pagination.limit > 0 &&
      descendingSort.pagination.records >= 0 &&
      descendingSort.pagination.pages >= 0,
  );

  // Step 11: Verify both sorts return same number of records
  TestValidator.equals(
    "both sort orders return same number of records",
    ascendingSort.data.length,
    descendingSort.data.length,
  );

  // Step 12: Verify the sorts are actually different (reverse of each other)
  if (ascendingSort.data.length > 1) {
    const firstAscId = ascendingSort.data[0].id;
    const firstDescId = descendingSort.data[descendingSort.data.length - 1].id;
    const lastAscId = ascendingSort.data[ascendingSort.data.length - 1].id;
    const lastDescId = descendingSort.data[0].id;

    TestValidator.equals(
      "first record in ascending should match last in descending",
      firstAscId,
      firstDescId,
    );

    TestValidator.equals(
      "last record in ascending should match first in descending",
      lastAscId,
      lastDescId,
    );
  }
}
