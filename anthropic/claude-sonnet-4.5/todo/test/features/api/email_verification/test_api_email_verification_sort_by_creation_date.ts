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
 * Test sorting email verification records by creation date in both ascending
 * and descending order.
 *
 * This test validates the sort_by and order parameters of the email
 * verification listing API. It ensures that verification records can be
 * properly sorted by their created_at timestamp in both directions, which is
 * essential for viewing verification history chronologically and finding recent
 * verification attempts quickly.
 *
 * Test workflow:
 *
 * 1. Create a new user account (generates email verification records)
 * 2. Retrieve verification records sorted by created_at in descending order
 *    (newest first)
 * 3. Validate that records are in correct descending chronological order
 * 4. Retrieve verification records sorted by created_at in ascending order (oldest
 *    first)
 * 5. Validate that records are in correct ascending chronological order
 * 6. Verify that both requests return the same data, just in reversed order
 */
export async function test_api_email_verification_sort_by_creation_date(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to generate email verification records
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

  // Step 2: Retrieve email verification records sorted by created_at descending (newest first)
  const descendingResult =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user.id,
        body: {
          sort_by: "created_at",
          order: "desc",
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Step 3: Validate descending order - each record should have created_at >= next record
  TestValidator.predicate(
    "descending results should have at least one record",
    descendingResult.data.length > 0,
  );

  for (let i = 0; i < descendingResult.data.length - 1; i++) {
    const current = new Date(descendingResult.data[i].created_at).getTime();
    const next = new Date(descendingResult.data[i + 1].created_at).getTime();

    TestValidator.predicate(
      `descending order: record ${i} created_at should be >= record ${i + 1}`,
      current >= next,
    );
  }

  // Step 4: Retrieve email verification records sorted by created_at ascending (oldest first)
  const ascendingResult =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user.id,
        body: {
          sort_by: "created_at",
          order: "asc",
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Step 5: Validate ascending order - each record should have created_at <= next record
  TestValidator.predicate(
    "ascending results should have at least one record",
    ascendingResult.data.length > 0,
  );

  for (let i = 0; i < ascendingResult.data.length - 1; i++) {
    const current = new Date(ascendingResult.data[i].created_at).getTime();
    const next = new Date(ascendingResult.data[i + 1].created_at).getTime();

    TestValidator.predicate(
      `ascending order: record ${i} created_at should be <= record ${i + 1}`,
      current <= next,
    );
  }

  // Step 6: Verify both requests return the same number of records
  TestValidator.equals(
    "both sort orders should return same number of records",
    descendingResult.data.length,
    ascendingResult.data.length,
  );

  // Step 7: Verify the records are the same, just in reversed order
  const descendingIds = descendingResult.data.map((v) => v.id);
  const ascendingIds = ascendingResult.data.map((v) => v.id);
  const reversedDescendingIds = [...descendingIds].reverse();

  TestValidator.equals(
    "ascending order should be reverse of descending order",
    ascendingIds,
    reversedDescendingIds,
  );
}
