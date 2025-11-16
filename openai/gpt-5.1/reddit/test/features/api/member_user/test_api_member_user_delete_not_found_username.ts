import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that deleting a member user by a non-existent username fails with an
 * error and does not affect the authenticated account.
 *
 * Business scenario:
 *
 * - A memberUser registers via the join endpoint, establishing an authenticated
 *   context.
 * - While authenticated, they attempt to delete an account identified by a
 *   username that does not exist anywhere in the system.
 * - The platform must respond with a not-found style error for this deletion
 *   attempt and must not apply any side effects to existing accounts.
 *
 * Steps:
 *
 * 1. Call POST /auth/memberUser/join to create a new member user and obtain an
 *    authenticated session.
 * 2. Construct a random username that is guaranteed to differ from the created
 *    user’s username.
 * 3. Call DELETE /communityPlatform/memberUser/memberUsers/{username} with that
 *    non-existent username while authenticated.
 * 4. Assert that the deletion call throws an error (indicating not-found
 *    semantics) and does not succeed.
 */
export async function test_api_member_user_delete_not_found_username(
  connection: api.IConnection,
) {
  // 1. Register a new member user to establish authenticated context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Construct a username that is guaranteed to be non-existent by
  //    appending a distinctive suffix to the real username.
  const nonExistentUsername: string = `${authorized.username}_nonexistent_${RandomGenerator.alphaNumeric(8)}`;

  // 3. Attempt to delete the non-existent username and ensure it fails.
  await TestValidator.error(
    "delete non-existent memberUser username must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.erase(
        connection,
        {
          username: nonExistentUsername,
        },
      );
    },
  );
}
