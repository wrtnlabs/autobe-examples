import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListPasswordReset";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test filtering password reset requests using creation and expiration date
 * ranges.
 *
 * This test validates temporal filtering capabilities for password reset
 * records, ensuring that date range filters work correctly with ISO 8601
 * formatted timestamps.
 *
 * Test workflow:
 *
 * 1. Create a user account for authentication
 * 2. Generate multiple password reset requests to create test data
 * 3. Test filtering with created_after to find recent reset requests
 * 4. Test filtering with created_before to find historical requests
 * 5. Test combined created_after and created_before for specific time windows
 * 6. Test expires_after filtering for tokens valid beyond a timestamp
 * 7. Test expires_before filtering for tokens expiring before a timestamp
 * 8. Verify ISO 8601 date-time format interpretation with timezone
 */
export async function test_api_password_reset_search_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "testPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Generate multiple password reset requests
  const resetCount = 5;
  const resetResults = await ArrayUtil.asyncRepeat(resetCount, async () => {
    const result: ITodoListPasswordReset.IRequestResult =
      await api.functional.auth.user.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: userEmail,
          } satisfies ITodoListPasswordReset.IRequest,
        },
      );
    typia.assert(result);
    return result;
  });

  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 3: Calculate reference timestamps for filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  // Step 4: Test filtering with created_after
  const afterFilter: IPageITodoListPasswordReset.ISummary =
    await api.functional.todoList.user.users.passwordResets.index(connection, {
      userId: user.id,
      body: {
        created_after: oneHourAgo.toISOString(),
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(afterFilter);
  TestValidator.predicate(
    "created_after filter returns results",
    afterFilter.data.length > 0,
  );

  // Verify all results are after the filter timestamp
  await ArrayUtil.asyncForEach(afterFilter.data, async (reset) => {
    const createdAt = new Date(reset.created_at);
    TestValidator.predicate(
      "reset request created after filter timestamp",
      createdAt >= oneHourAgo,
    );
  });

  // Step 5: Test filtering with created_before
  const beforeFilter: IPageITodoListPasswordReset.ISummary =
    await api.functional.todoList.user.users.passwordResets.index(connection, {
      userId: user.id,
      body: {
        created_before: oneHourLater.toISOString(),
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(beforeFilter);
  TestValidator.predicate(
    "created_before filter returns results",
    beforeFilter.data.length > 0,
  );

  // Verify all results are before the filter timestamp
  await ArrayUtil.asyncForEach(beforeFilter.data, async (reset) => {
    const createdAt = new Date(reset.created_at);
    TestValidator.predicate(
      "reset request created before filter timestamp",
      createdAt <= oneHourLater,
    );
  });

  // Step 6: Test combined date range filtering
  const rangeFilter: IPageITodoListPasswordReset.ISummary =
    await api.functional.todoList.user.users.passwordResets.index(connection, {
      userId: user.id,
      body: {
        created_after: oneHourAgo.toISOString(),
        created_before: oneHourLater.toISOString(),
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(rangeFilter);
  TestValidator.predicate(
    "date range filter returns results",
    rangeFilter.data.length > 0,
  );

  // Verify all results fall within the date range
  await ArrayUtil.asyncForEach(rangeFilter.data, async (reset) => {
    const createdAt = new Date(reset.created_at);
    TestValidator.predicate(
      "reset request within date range",
      createdAt >= oneHourAgo && createdAt <= oneHourLater,
    );
  });

  // Step 7: Test expires_after filtering
  const expiresAfterFilter: IPageITodoListPasswordReset.ISummary =
    await api.functional.todoList.user.users.passwordResets.index(connection, {
      userId: user.id,
      body: {
        expires_after: now.toISOString(),
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(expiresAfterFilter);

  // Verify all results expire after the filter timestamp
  await ArrayUtil.asyncForEach(expiresAfterFilter.data, async (reset) => {
    const expiresAt = new Date(reset.expires_at);
    TestValidator.predicate(
      "reset token expires after filter timestamp",
      expiresAt >= now,
    );
  });

  // Step 8: Test expires_before filtering
  const expiresBeforeFilter: IPageITodoListPasswordReset.ISummary =
    await api.functional.todoList.user.users.passwordResets.index(connection, {
      userId: user.id,
      body: {
        expires_before: twoHoursLater.toISOString(),
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(expiresBeforeFilter);
  TestValidator.predicate(
    "expires_before filter returns results",
    expiresBeforeFilter.data.length > 0,
  );

  // Verify all results expire before the filter timestamp
  await ArrayUtil.asyncForEach(expiresBeforeFilter.data, async (reset) => {
    const expiresAt = new Date(reset.expires_at);
    TestValidator.predicate(
      "reset token expires before filter timestamp",
      expiresAt <= twoHoursLater,
    );
  });

  // Step 9: Verify ISO 8601 format with timezone information
  const allResets: IPageITodoListPasswordReset.ISummary =
    await api.functional.todoList.user.users.passwordResets.index(connection, {
      userId: user.id,
      body: {} satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(allResets);

  await ArrayUtil.asyncForEach(allResets.data, async (reset) => {
    // Verify created_at is valid ISO 8601 date-time
    const createdAt = new Date(reset.created_at);
    TestValidator.predicate(
      "created_at is valid date-time",
      !isNaN(createdAt.getTime()),
    );

    // Verify expires_at is valid ISO 8601 date-time
    const expiresAt = new Date(reset.expires_at);
    TestValidator.predicate(
      "expires_at is valid date-time",
      !isNaN(expiresAt.getTime()),
    );

    // Verify expires_at is after created_at
    TestValidator.predicate(
      "expires_at is after created_at",
      expiresAt > createdAt,
    );
  });
}
