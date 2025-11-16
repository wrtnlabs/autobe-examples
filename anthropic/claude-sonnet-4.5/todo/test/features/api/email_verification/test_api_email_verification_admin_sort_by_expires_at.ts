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
 * Test sorting email verification records by their expiration timestamp in both
 * ascending and descending order.
 *
 * This test validates the admin's ability to retrieve email verification
 * records sorted by the expires_at field. The test creates multiple user
 * accounts to generate verification tokens with different expiration times,
 * then verifies that the API correctly returns records sorted by expiration
 * date in both ascending (soonest expiration first) and descending (latest
 * expiration first) order.
 *
 * Implementation steps:
 *
 * 1. Create an admin account and authenticate as administrator
 * 2. Create multiple user accounts to generate email verification tokens with
 *    varying expiration times
 * 3. Retrieve verification records sorted by expires_at in ascending order
 * 4. Validate that records are correctly ordered by expiration timestamp (earliest
 *    to latest)
 * 5. Retrieve verification records sorted by expires_at in descending order
 * 6. Verify that records are correctly ordered by expiration timestamp (latest to
 *    earliest)
 */
export async function test_api_email_verification_admin_sort_by_expires_at(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
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

  // Step 2: Create multiple user accounts to generate verification tokens
  const userCount = 5;
  const users: ITodoListUser.IAuthorized[] = await ArrayUtil.asyncRepeat(
    userCount,
    async (index) => {
      const userData = {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate;

      const user: ITodoListUser.IAuthorized =
        await api.functional.auth.user.join(connection, {
          body: userData,
        });
      typia.assert(user);
      return user;
    },
  );

  // Get the first user's ID to retrieve their verification records
  const firstUserId = users[0].id;

  // Step 3: Retrieve verification records sorted by expires_at in ascending order
  const ascendingRequest = {
    page: 1,
    limit: 10,
    sort_by: "expires_at" as const,
    order: "asc" as const,
  } satisfies ITodoListEmailVerification.IRequest;

  const ascendingResult: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.admin.users.emailVerifications.index(
      connection,
      {
        userId: firstUserId,
        body: ascendingRequest,
      },
    );
  typia.assert(ascendingResult);

  // Step 4: Validate ascending order - each expiration should be <= the next
  if (ascendingResult.data.length > 1) {
    for (let i = 0; i < ascendingResult.data.length - 1; i++) {
      const current = new Date(ascendingResult.data[i].expires_at).getTime();
      const next = new Date(ascendingResult.data[i + 1].expires_at).getTime();

      TestValidator.predicate(
        "ascending order verification - current expires_at should be <= next expires_at",
        current <= next,
      );
    }
  }

  // Step 5: Retrieve verification records sorted by expires_at in descending order
  const descendingRequest = {
    page: 1,
    limit: 10,
    sort_by: "expires_at" as const,
    order: "desc" as const,
  } satisfies ITodoListEmailVerification.IRequest;

  const descendingResult: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.admin.users.emailVerifications.index(
      connection,
      {
        userId: firstUserId,
        body: descendingRequest,
      },
    );
  typia.assert(descendingResult);

  // Step 6: Validate descending order - each expiration should be >= the next
  if (descendingResult.data.length > 1) {
    for (let i = 0; i < descendingResult.data.length - 1; i++) {
      const current = new Date(descendingResult.data[i].expires_at).getTime();
      const next = new Date(descendingResult.data[i + 1].expires_at).getTime();

      TestValidator.predicate(
        "descending order verification - current expires_at should be >= next expires_at",
        current >= next,
      );
    }
  }

  // Verify that both results contain valid pagination metadata
  TestValidator.predicate(
    "ascending result has valid pagination",
    ascendingResult.pagination.current >= 0 &&
      ascendingResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "descending result has valid pagination",
    descendingResult.pagination.current >= 0 &&
      descendingResult.pagination.limit > 0,
  );
}
