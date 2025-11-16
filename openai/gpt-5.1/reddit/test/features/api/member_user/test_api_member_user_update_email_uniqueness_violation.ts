import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that updating a member user's email to an address already used by
 * another member is rejected due to uniqueness constraints.
 *
 * Business context:
 *
 * - Community_platform_memberusers enforces unique email addresses across all
 *   member users.
 * - The join endpoint both creates the member row and authenticates the session,
 *   wiring the Authorization header automatically via the SDK.
 * - The update endpoint allows changing mutable fields, including email, for the
 *   authenticated member identified by the {username} path parameter.
 *
 * Test workflow:
 *
 * 1. Register User A with a unique username and email via POST
 *    /auth/memberUser/join.
 * 2. Register User B with a different username and email via POST
 *    /auth/memberUser/join. This second join call leaves the connection
 *    authenticated as User B.
 * 3. Attempt to update User B's account via PUT
 *    /communityPlatform/memberUser/memberUsers/{username}, targeting User B's
 *    username, and set `email` in the ICommunityPlatformMemberuser.IUpdate body
 *    to User A's email, creating an email collision.
 * 4. Wrap the update call in TestValidator.error to assert that an error is
 *    thrown, indicating that email uniqueness is enforced on update and that
 *    the conflict is rejected.
 * 5. Perform a non-email-changing update on User B to confirm that non-conflicting
 *    updates still succeed, demonstrating that the failure is specific to the
 *    email uniqueness rule.
 */
export async function test_api_member_user_update_email_uniqueness_violation(
  connection: api.IConnection,
) {
  // 1. Register User A with unique username and email
  const userAJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const userA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: userAJoinBody,
    });
  typia.assert(userA);

  // 2. Register User B with a different username and email (connection will be authenticated as B)
  const userBJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const userB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: userBJoinBody,
    });
  typia.assert(userB);

  await TestValidator.predicate(
    "user A and B emails must be different before conflict test",
    async () => userA.email !== userB.email,
  );

  // 3. Attempt to update User B's email to User A's email, which should violate uniqueness
  const conflictingUpdateBody = {
    email: userA.email,
  } satisfies ICommunityPlatformMemberuser.IUpdate;

  await TestValidator.error(
    "updating email to an existing member's email must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.update(
        connection,
        {
          username: userB.username,
          body: conflictingUpdateBody,
        },
      );
    },
  );

  // 4. Sanity check: perform a non-conflicting update that should succeed
  const nonConflictingUpdateBody = {
    is_email_verified: !userB.is_email_verified,
  } satisfies ICommunityPlatformMemberuser.IUpdate;

  const updatedUser: ICommunityPlatformMemberuser =
    await api.functional.communityPlatform.memberUser.memberUsers.update(
      connection,
      {
        username: userB.username,
        body: nonConflictingUpdateBody,
      },
    );
  typia.assert(updatedUser);

  TestValidator.equals(
    "user B's email remains unchanged after non-conflicting update",
    updatedUser.email,
    userB.email,
  );
}
