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
 * Test the response when filtering produces no matching verification records.
 *
 * This scenario validates proper handling of empty result sets:
 *
 * 1. Create a user account,
 * 2. Apply filters that intentionally produce no matches (e.g., searching for a
 *    non-existent email pattern, or filtering for verified=true when all
 *    records are unverified),
 * 3. Verify the response returns an empty data array,
 * 4. Verify pagination metadata correctly shows 0 records and 0 pages,
 * 5. Verify the response structure remains valid with proper typing even with no
 *    results.
 *
 * This tests edge case handling ensuring the API gracefully handles queries
 * with no matching data.
 */
export async function test_api_email_verification_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create a user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Apply filters that produce no matches - search for non-existent email
  const nonExistentEmailPattern =
    "nonexistent-email-" +
    RandomGenerator.alphaNumeric(16) +
    "@impossible-domain-12345.com";

  const emptyResultBySearch =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user.id,
        body: {
          search: nonExistentEmailPattern,
          page: 1,
          limit: 10,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(emptyResultBySearch);

  // Step 3: Verify the response returns an empty data array
  TestValidator.equals(
    "search with non-existent email should return empty data array",
    emptyResultBySearch.data.length,
    0,
  );

  // Step 4: Verify pagination metadata shows 0 records and 0 pages
  TestValidator.equals(
    "pagination records should be 0 for non-existent search",
    emptyResultBySearch.pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination pages should be 0 for non-existent search",
    emptyResultBySearch.pagination.pages,
    0,
  );

  // Additional test: Filter for verified=true when all records are unverified
  const emptyResultByVerified =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user.id,
        body: {
          verified: true,
          page: 1,
          limit: 10,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(emptyResultByVerified);

  // Verify empty results for verified filter
  TestValidator.equals(
    "filter for verified=true should return empty data array when no verified records",
    emptyResultByVerified.data.length,
    0,
  );

  TestValidator.equals(
    "pagination records should be 0 for verified filter with no matches",
    emptyResultByVerified.pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination pages should be 0 for verified filter with no matches",
    emptyResultByVerified.pagination.pages,
    0,
  );
}
