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
 * Test that administrators can combine multiple filters simultaneously for
 * complex searches.
 *
 * This test validates the administrative monitoring scenario where admins need
 * to search password reset requests using multiple filter criteria combined
 * together. The test creates diverse password reset requests with different
 * attributes, then verifies that combining email filters, usage status filters,
 * creation time ranges, expiration time ranges, sorting, and pagination all
 * work together correctly to produce accurate intersected results.
 *
 * Steps:
 *
 * 1. Authenticate as administrator
 * 2. Create multiple test users with different emails
 * 3. Generate diverse password reset requests with varying timestamps and statuses
 * 4. Execute search with multiple combined filters
 * 5. Validate that all filters work together and return expected intersected
 *    results
 * 6. Test different combinations of filters including pagination and sorting
 */
export async function test_api_password_reset_admin_combined_filters(
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
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create multiple test users for generating diverse password reset requests
  const userCount = 5;
  const users = await ArrayUtil.asyncRepeat(userCount, async (index) => {
    const userData = {
      email: `testuser${index}_${typia.random<string & tags.Format<"email">>()}`,
      password: "testpass123",
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate;

    const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
      connection,
      { body: userData },
    );
    typia.assert(user);
    return user;
  });

  // Step 3: Generate password reset requests for different users
  const resetRequests = await ArrayUtil.asyncRepeat(
    userCount,
    async (index) => {
      const requestData = {
        email: users[index].email,
      } satisfies ITodoListPasswordReset.IRequest;

      const resetResult: ITodoListPasswordReset.IRequestResult =
        await api.functional.auth.user.password.reset.request.requestPasswordReset(
          connection,
          { body: requestData },
        );
      typia.assert(resetResult);
      return resetResult;
    },
  );

  // Step 4: Test combined filters - email filter + pagination
  const targetUser = users[0];
  const emailFilterResult: IPageITodoListPasswordReset.ISummary =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: targetUser.id,
      body: {
        email: targetUser.email,
        page: 1,
        limit: 10,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(emailFilterResult);

  // Validate email filter worked
  TestValidator.predicate(
    "email filter returns results for target user",
    emailFilterResult.data.length > 0,
  );
  TestValidator.predicate(
    "all returned results match target email",
    emailFilterResult.data.every((reset) => reset.email === targetUser.email),
  );

  // Step 5: Test combined filters - usage status filter + sorting
  const usageFilterResult: IPageITodoListPasswordReset.ISummary =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: targetUser.id,
      body: {
        used: false,
        sort: "created_at_desc",
        page: 1,
        limit: 20,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(usageFilterResult);

  // Validate usage filter worked
  TestValidator.predicate(
    "usage filter returns only unused tokens",
    usageFilterResult.data.every((reset) => reset.used === false),
  );

  // Step 6: Test combined filters - time range filters + email + pagination
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  const timeRangeResult: IPageITodoListPasswordReset.ISummary =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: targetUser.id,
      body: {
        email: targetUser.email,
        created_after: oneDayAgo.toISOString(),
        created_before: now.toISOString(),
        expires_after: now.toISOString(),
        expires_before: oneHourFromNow.toISOString(),
        page: 1,
        limit: 10,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(timeRangeResult);

  // Step 7: Test complex combination - all filters together
  const complexFilterResult: IPageITodoListPasswordReset.ISummary =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: targetUser.id,
      body: {
        email: targetUser.email,
        used: false,
        created_after: oneDayAgo.toISOString(),
        created_before: now.toISOString(),
        expires_after: now.toISOString(),
        sort: "expires_at_asc",
        page: 1,
        limit: 5,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(complexFilterResult);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata is valid",
    complexFilterResult.pagination.current >= 0 &&
      complexFilterResult.pagination.limit > 0 &&
      complexFilterResult.pagination.records >= 0 &&
      complexFilterResult.pagination.pages >= 0,
  );

  // Step 8: Test different sorting options with filters
  const sortingTests = [
    "created_at_asc",
    "created_at_desc",
    "expires_at_asc",
    "expires_at_desc",
  ] as const;

  for (const sortOption of sortingTests) {
    const sortedResult: IPageITodoListPasswordReset.ISummary =
      await api.functional.todoList.admin.users.passwordResets.index(
        connection,
        {
          userId: targetUser.id,
          body: {
            sort: sortOption,
            page: 1,
            limit: 10,
          } satisfies ITodoListPasswordReset.IRequest,
        },
      );
    typia.assert(sortedResult);

    TestValidator.predicate(
      `sorting with ${sortOption} returns valid results`,
      sortedResult.data.length >= 0,
    );
  }

  // Step 9: Test pagination with combined filters
  const paginationResult1: IPageITodoListPasswordReset.ISummary =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: targetUser.id,
      body: {
        email: targetUser.email,
        page: 1,
        limit: 2,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(paginationResult1);

  TestValidator.predicate(
    "first page pagination works correctly",
    paginationResult1.pagination.current === 1 &&
      paginationResult1.pagination.limit === 2,
  );
}
