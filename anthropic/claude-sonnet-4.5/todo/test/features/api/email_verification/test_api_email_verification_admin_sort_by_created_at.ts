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
 * Test sorting email verification records by their creation timestamp in both
 * ascending and descending order.
 *
 * This test validates chronological ordering of verification attempts by:
 *
 * 1. Creating an admin account for authentication
 * 2. Creating multiple user accounts to generate verification records at different
 *    times
 * 3. Collecting all verification records from all users
 * 4. Testing descending sort order (newest first) on the collected records
 * 5. Testing ascending sort order (oldest first) on the collected records
 * 6. Verifying that sort order correctly arranges records by creation timestamp
 */
export async function test_api_email_verification_admin_sort_by_created_at(
  connection: api.IConnection,
) {
  // 1. Create an admin account for authentication
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

  // 2. Create multiple user accounts to generate verification records
  const userCount = 5;
  const createdUsers: ITodoListUser.IAuthorized[] = [];

  for (let i = 0; i < userCount; i++) {
    const userData = {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123",
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
    createdUsers.push(user);
  }

  // 3. Collect all verification records from all users
  const allVerifications: ITodoListEmailVerification.ISummary[] = [];

  for (const user of createdUsers) {
    const result: IPageITodoListEmailVerification.ISummary =
      await api.functional.todoList.admin.users.emailVerifications.index(
        connection,
        {
          userId: user.id,
          body: {
            page: 1,
            limit: 100,
          } satisfies ITodoListEmailVerification.IRequest,
        },
      );
    typia.assert(result);
    allVerifications.push(...result.data);
  }

  TestValidator.predicate(
    "should have collected verification records",
    allVerifications.length > 0,
  );

  // 4. Test descending sort order (newest first)
  const descendingRequest = {
    page: 1,
    limit: 100,
    sort_by: "created_at",
    order: "desc",
  } satisfies ITodoListEmailVerification.IRequest;

  const descendingResults: IPageITodoListEmailVerification.ISummary[] = [];
  for (const user of createdUsers) {
    const result: IPageITodoListEmailVerification.ISummary =
      await api.functional.todoList.admin.users.emailVerifications.index(
        connection,
        {
          userId: user.id,
          body: descendingRequest,
        },
      );
    typia.assert(result);
    descendingResults.push(result);
  }

  // Validate descending order for each user's verifications
  for (const result of descendingResults) {
    for (let i = 0; i < result.data.length - 1; i++) {
      const current = new Date(result.data[i].created_at);
      const next = new Date(result.data[i + 1].created_at);
      TestValidator.predicate(
        "descending order: current should be newer than or equal to next",
        current >= next,
      );
    }
  }

  // 5. Test ascending sort order (oldest first)
  const ascendingRequest = {
    page: 1,
    limit: 100,
    sort_by: "created_at",
    order: "asc",
  } satisfies ITodoListEmailVerification.IRequest;

  const ascendingResults: IPageITodoListEmailVerification.ISummary[] = [];
  for (const user of createdUsers) {
    const result: IPageITodoListEmailVerification.ISummary =
      await api.functional.todoList.admin.users.emailVerifications.index(
        connection,
        {
          userId: user.id,
          body: ascendingRequest,
        },
      );
    typia.assert(result);
    ascendingResults.push(result);
  }

  // 6. Validate ascending order for each user's verifications
  for (const result of ascendingResults) {
    for (let i = 0; i < result.data.length - 1; i++) {
      const current = new Date(result.data[i].created_at);
      const next = new Date(result.data[i + 1].created_at);
      TestValidator.predicate(
        "ascending order: current should be older than or equal to next",
        current <= next,
      );
    }
  }

  // Verify that both sort orders return the same records
  for (let i = 0; i < descendingResults.length; i++) {
    TestValidator.equals(
      "both sort orders should return same number of records",
      descendingResults[i].data.length,
      ascendingResults[i].data.length,
    );
  }
}
