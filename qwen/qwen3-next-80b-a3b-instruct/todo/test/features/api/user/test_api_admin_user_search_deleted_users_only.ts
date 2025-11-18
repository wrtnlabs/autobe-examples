import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUser";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate searching users by 'deleted' flag returns only soft-deleted users
 * with proper privacy enforcement.
 *
 * This test checks that when filtering for soft-deleted users using the deleted
 * flag:
 *
 * - Only users with a non-null deleted_at (soft deleted) are returned
 * - Active users are excluded
 * - User summaries never contain sensitive fields (like password hashes or token
 *   information)
 * - The summary strictly matches the ITodoUser.ISummary schema
 * - Pagination works
 *
 * Steps:
 *
 * 1. Register user1 (to be deleted)
 * 2. Register user2 (the actor who will perform the search)
 * 3. Soft-delete user1 via endpoint
 * 4. Authenticate as user2
 * 5. Search users with { deleted: true }
 * 6. Validate only soft-deleted users are in the response and user1 is present
 * 7. Validate user summaries match privacy and schema constraints
 */
export async function test_api_admin_user_search_deleted_users_only(
  connection: api.IConnection,
) {
  // Step 1: Register user1
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Password = RandomGenerator.alphaNumeric(12);
  const user1JoinBody = {
    email: user1Email,
    password: user1Password,
    href: "https://todo.test/register",
    referrer: "https://todo.test/landing",
  } satisfies ITodoUser.IJoin;
  const user1 = await api.functional.auth.user.join(connection, {
    body: user1JoinBody,
  });
  typia.assert(user1);

  // Step 2: Register user2 (search actor)
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Password = RandomGenerator.alphaNumeric(12);
  const user2JoinBody = {
    email: user2Email,
    password: user2Password,
    href: "https://todo.test/register",
    referrer: "https://todo.test/landing",
  } satisfies ITodoUser.IJoin;
  const user2 = await api.functional.auth.user.join(connection, {
    body: user2JoinBody,
  });
  typia.assert(user2);

  // Step 3: Soft-delete user1
  const deletedUser = await api.functional.todo.user.users.erase(connection, {
    userId: user1.id,
  });
  typia.assert(deletedUser);
  TestValidator.notEquals(
    "deleted_at must be set for soft-deleted user",
    deletedUser.deleted_at,
    null,
  );

  // Step 4: Authenticate as user2 (actor)
  const loginResp = await api.functional.auth.user.login(connection, {
    body: {
      email: user2Email,
      password: user2Password as string & tags.Format<"password">,
      href: "https://todo.test/login",
      referrer: "https://todo.test/landing",
    } satisfies ITodoUser.ILogin,
  });
  typia.assert(loginResp);
  TestValidator.equals(
    "login actor email matches",
    loginResp.email,
    user2Email,
  );

  // Step 5: Perform search for deleted users
  const res = await api.functional.todo.user.users.index(connection, {
    body: {
      deleted: true,
      // Optionally set limit to include at least one record
      limit: 10 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    } satisfies ITodoUser.IRequest,
  });
  typia.assert(res);

  // Step 6: Validate at least one deleted user (user1) is present and schema correct
  const found = res.data.find((user) => user.id === user1.id);
  TestValidator.predicate(
    "deleted user is present in deleted users search",
    !!found,
  );
  TestValidator.equals(
    "deleted_at is populated for soft-deleted user",
    found?.deleted_at != null,
    true,
  );
  TestValidator.equals(
    "deleted users summary has only allowed fields",
    Object.keys(found!),
    ["id", "email", "created_at", "deleted_at"],
  );
  // Every result is a deleted user and summary structure correct
  for (const summary of res.data) {
    TestValidator.notEquals(
      "deleted_at must not be null for soft-deleted result",
      summary.deleted_at,
      null,
    );
    TestValidator.equals(
      "user summary only exposes non-sensitive fields",
      Object.keys(summary).sort(),
      ["created_at", "deleted_at", "email", "id"],
    );
  }

  // Step 7: Ensure search does not include active (non-deleted) user2
  for (const summary of res.data) {
    TestValidator.notEquals(
      "matched user should not be the actor (active)",
      summary.id,
      user2.id,
    );
    TestValidator.notEquals(
      "active user2 email must not appear in deleted users search",
      summary.email,
      user2Email,
    );
  }

  // Pagination structure validation
  TestValidator.equals(
    "pagination limit matches request",
    res.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination current page >= 0",
    res.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    res.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    res.pagination.pages >= 0,
  );
}
