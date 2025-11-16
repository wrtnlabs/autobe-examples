import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListEmailVerification";
import type { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test sorting email verification records by expiration timestamp to identify
 * which tokens expire soonest or have expired most recently.
 *
 * This scenario validates:
 *
 * 1. User account creation with verification records
 * 2. Querying verification list with sort_by=expires_at and order=asc to show
 *    tokens expiring soonest first
 * 3. Querying with sort_by=expires_at and order=desc to show tokens with latest
 *    expiration first
 * 4. Verifying records are correctly ordered by their expires_at timestamps
 *
 * This tests expiration-based sorting which is critical for proactive token
 * renewal workflows and identifying tokens that need immediate action before
 * expiration.
 */
export async function test_api_email_verification_sort_by_expiration_date(
  connection: api.IConnection,
) {
  // Step 1: Create user account to generate verification records
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Query verification list with sort_by=expires_at and order=asc (soonest expiration first)
  const ascendingResult: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user.id,
        body: {
          sort_by: "expires_at",
          order: "asc",
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Step 3: Query verification list with sort_by=expires_at and order=desc (latest expiration first)
  const descendingResult: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user.id,
        body: {
          sort_by: "expires_at",
          order: "desc",
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Step 4: Verify records are correctly ordered by expires_at timestamps
  if (ascendingResult.data.length > 1) {
    for (let i = 0; i < ascendingResult.data.length - 1; i++) {
      const current = new Date(ascendingResult.data[i].expires_at).getTime();
      const next = new Date(ascendingResult.data[i + 1].expires_at).getTime();

      TestValidator.predicate(
        "ascending order: current expires_at should be <= next expires_at",
        current <= next,
      );
    }
  }

  if (descendingResult.data.length > 1) {
    for (let i = 0; i < descendingResult.data.length - 1; i++) {
      const current = new Date(descendingResult.data[i].expires_at).getTime();
      const next = new Date(descendingResult.data[i + 1].expires_at).getTime();

      TestValidator.predicate(
        "descending order: current expires_at should be >= next expires_at",
        current >= next,
      );
    }
  }

  // Step 5: Verify both results contain the same records (just in different order)
  TestValidator.equals(
    "both queries should return same number of records",
    ascendingResult.pagination.records,
    descendingResult.pagination.records,
  );
}
