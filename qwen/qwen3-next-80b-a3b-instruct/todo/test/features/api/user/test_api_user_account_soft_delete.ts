import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test the soft-delete (flag as deleted) operation for a todo_user account.
 *
 * Verifies that a registered user can be soft-deleted (deleted_at set) and
 * becomes ineligible for authentication. Steps:
 *
 * 1. Register a new user via the join endpoint.
 * 2. Use the authenticated context to delete (soft-delete) the user.
 * 3. Validate that the deleted_at timestamp is set.
 * 4. Attempt to login after soft-delete and expect failure.
 */
export async function test_api_user_account_soft_delete(
  connection: api.IConnection,
) {
  // 1. Register new user via join endpoint
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12);
  const href: string & tags.Format<"uri"> =
    `https://test.app/${RandomGenerator.alphaNumeric(8)}`;
  const referrer: string & tags.Format<"uri"> =
    `https://referrer.test/${RandomGenerator.alphaNumeric(10)}`;
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(userJoin);

  // 2. Soft-delete user (invoke DELETE)
  const erased: ITodoUser = await api.functional.todo.user.users.erase(
    connection,
    {
      userId: userJoin.id,
    },
  );
  typia.assert(erased);

  // 3. Check deleted_at is set (not null/undefined)
  TestValidator.predicate(
    "deleted_at must be set after soft-delete",
    erased.deleted_at !== null && erased.deleted_at !== undefined,
  );

  // 4. Attempt login with deleted user
  await TestValidator.error(
    "cannot login with soft-deleted user",
    async () =>
      await api.functional.auth.user.join(connection, {
        body: {
          email,
          password,
          href,
          referrer,
        } satisfies ITodoUser.IJoin,
      }),
  );
}
